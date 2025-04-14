""""""
from __future__ import annotations
import typing as t

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from aiida.cmdline.utils.decorators import with_dbenv
from aiida_workgraph.engine.scheduler.client import (
    get_scheduler_client,
    get_all_schedulers,
    get_scheduler,
)
from aiida_workgraph.engine.scheduler.scheduler import Scheduler
import kiwipy

router = APIRouter()


class SchedulerStatusModel(BaseModel):
    """Response model describing a scheduler's status."""

    name: str = Field(..., description="The name of the scheduler")
    pk: int = Field(..., description="Primary key of the scheduler")
    running: bool = Field(..., description="Whether the scheduler is running")
    waiting_process_count: int = Field(..., description="Number of waiting processes")
    running_process_count: int = Field(..., description="Number of running processes")
    running_calcjob_count: int = Field(..., description="Number of running calcjobs")
    max_calcjobs: int = Field(..., description="Maximum number of calcjobs allowed")
    max_processes: int = Field(
        ..., description="Maximum number of concurrent processes"
    )


@router.get("/api/scheduler/list", response_model=t.List[SchedulerStatusModel])
@with_dbenv()
async def list_schedulers():
    """
    List all schedulers with their status.
    """
    schedulers = get_all_schedulers()
    scheduler_list = []
    for sched in schedulers:
        try:
            running = bool(Scheduler.get_status(name=sched.name))
        except Exception:
            running = False
        scheduler_list.append(
            SchedulerStatusModel(
                name=sched.name,
                pk=sched.pk,
                running=running,
                waiting_process_count=len(sched.waiting_process),
                running_process_count=len(sched.running_process),
                running_calcjob_count=len(sched.running_calcjob),
                max_calcjobs=sched.max_calcjobs,
                max_processes=sched.max_processes,
            )
        )
    return scheduler_list


@router.get("/api/scheduler/status/{name}", response_model=SchedulerStatusModel)
@with_dbenv()
async def get_scheduler_status(name: str):
    """
    Get status details for a scheduler by name.
    """
    sched = get_scheduler(name=name)
    if not sched:
        raise HTTPException(status_code=404, detail=f"Scheduler {name} not found.")
    try:
        running = bool(Scheduler.get_status(name=sched.name))
    except Exception:
        running = False

    return SchedulerStatusModel(
        name=sched.name,
        pk=sched.pk,
        running=running,
        waiting_process_count=len(sched.waiting_process),
        running_process_count=len(sched.running_process),
        running_calcjob_count=len(sched.running_calcjob),
        max_calcjobs=sched.max_calcjobs,
        max_processes=sched.max_processes,
    )


class SchedulerControlModel(BaseModel):
    """Input model for controlling a scheduler."""

    name: str = Field(..., description="Scheduler name")
    max_calcjobs: t.Optional[int] = Field(None, description="Maximum calcjobs")
    max_processes: t.Optional[int] = Field(None, description="Maximum processes")
    foreground: t.Optional[bool] = Field(False, description="Run in foreground")
    timeout: t.Optional[int] = Field(None, description="Optional timeout value")


@router.post("/api/scheduler/start", response_model=SchedulerStatusModel)
@with_dbenv()
async def start_scheduler_endpoint(control: SchedulerControlModel):
    """
    Start the scheduler with the given parameters.
    """
    import asyncio
    import time

    client = get_scheduler_client(scheduler_name=control.name)

    try:
        client.start_daemon(
            max_calcjobs=control.max_calcjobs,
            max_processes=control.max_processes,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    timeout_seconds = 10  # Adjust as needed or make configurable
    poll_interval = 1
    start_time = time.time()

    # Wait for the scheduler to be available or timeout
    sched = get_scheduler(name=control.name)
    while not sched:
        if time.time() - start_time > timeout_seconds:
            raise HTTPException(
                status_code=504,
                detail=f"Timeout while waiting for scheduler '{control.name}' to start.",
            )
        await asyncio.sleep(poll_interval)
        sched = get_scheduler(name=control.name)
    if not sched:
        raise HTTPException(
            status_code=404, detail=f"Scheduler {control.name} not found."
        )
    try:
        running = bool(Scheduler.get_status(name=sched.name))
    except Exception:
        running = False
    return SchedulerStatusModel(
        name=sched.name,
        pk=sched.pk,
        running=running,
        waiting_process_count=len(sched.waiting_process),
        running_process_count=len(sched.running_process),
        running_calcjob_count=len(sched.running_calcjob),
        max_calcjobs=sched.max_calcjobs,
        max_processes=sched.max_processes,
    )


@router.post("/api/scheduler/delete")
@with_dbenv()
async def delete_scheduler_endpoint(control: SchedulerControlModel):
    """
    Delete a scheduler by name.

    Raises HTTP 400 if the scheduler is running. Otherwise deletes the node from the DB.
    """
    from aiida.tools import delete_nodes

    scheduler = get_scheduler(name=control.name)
    if not scheduler:
        raise HTTPException(
            status_code=404, detail=f"Scheduler '{control.name}' not found."
        )

    # Check if running
    if Scheduler.get_status(name=scheduler.name):
        raise HTTPException(
            status_code=400,
            detail=f"Scheduler '{scheduler.name}' is running, please stop it first.",
        )

    _, was_deleted = delete_nodes([scheduler.pk], dry_run=False)
    if not was_deleted:
        raise HTTPException(
            status_code=500, detail="Could not delete the scheduler node."
        )

    return {"message": f"Scheduler '{control.name}' was deleted successfully."}


@router.post("/api/scheduler/stop", response_model=SchedulerStatusModel)
@with_dbenv()
async def stop_scheduler_endpoint(
    name: str = Query(..., description="Scheduler name to stop")
):
    """
    Stop a running scheduler.
    """

    sched = get_scheduler(name=name)
    if not sched:
        raise HTTPException(status_code=404, detail=f"Scheduler {name} not found.")
    try:
        client = get_scheduler_client(scheduler_name=sched.name)
        client.stop_daemon(wait=True)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    # Update scheduler status after stopping
    sched = get_scheduler(name=name)
    try:
        running = bool(Scheduler.get_status(name=sched.name))
    except Exception:
        running = False
    return SchedulerStatusModel(
        name=sched.name,
        pk=sched.pk,
        running=running,
        waiting_process_count=len(sched.waiting_process),
        running_process_count=len(sched.running_process),
        running_calcjob_count=len(sched.running_calcjob),
        max_calcjobs=sched.max_calcjobs,
        max_processes=sched.max_processes,
    )


@router.post("/api/scheduler/set_max_calcjobs", response_model=SchedulerStatusModel)
@with_dbenv()
async def set_max_calcjobs(control: SchedulerControlModel):
    """
    Set maximum calcjobs for the scheduler.
    """
    try:
        Scheduler.set_max_calcjobs(name=control.name, max_calcjobs=control.max_calcjobs)
    except kiwipy.exceptions.UnroutableError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    sched = get_scheduler(name=control.name)
    try:
        running = bool(Scheduler.get_status(name=sched.name))
    except Exception:
        running = False
    return SchedulerStatusModel(
        name=sched.name,
        pk=sched.pk,
        running=running,
        waiting_process_count=len(sched.waiting_process),
        running_process_count=len(sched.running_process),
        running_calcjob_count=len(sched.running_calcjob),
        max_calcjobs=sched.max_calcjobs,
        max_processes=sched.max_processes,
    )


@router.post("/api/scheduler/set_max_processes", response_model=SchedulerStatusModel)
@with_dbenv()
async def set_max_processes(control: SchedulerControlModel):
    """
    Set maximum processes for the scheduler.
    """
    try:
        Scheduler.set_max_processes(
            name=control.name, max_processes=control.max_processes
        )
    except kiwipy.exceptions.UnroutableError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    sched = get_scheduler(name=control.name)
    try:
        running = bool(Scheduler.get_status(name=sched.name))
    except Exception:
        running = False
    return SchedulerStatusModel(
        name=sched.name,
        pk=sched.pk,
        running=running,
        waiting_process_count=len(sched.waiting_process),
        running_process_count=len(sched.running_process),
        running_calcjob_count=len(sched.running_calcjob),
        max_calcjobs=sched.max_calcjobs,
        max_processes=sched.max_processes,
    )
