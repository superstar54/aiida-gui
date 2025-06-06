from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from aiida.manage import manager
from aiida_workgraph_web_ui.backend.app.workchain import router as workchain_router
from aiida_workgraph_web_ui.backend.app.task import router as task_router
from aiida_workgraph_web_ui.backend.app.process_node import router as process_router
from aiida_workgraph_web_ui.backend.app.daemon import router as daemon_router
from aiida_workgraph_web_ui.backend.app.data_node import router as datanode_router
from aiida_workgraph_web_ui.backend.app.group_node import router as groupnode_router
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

from fastapi.responses import FileResponse
from fastapi.exception_handlers import http_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException

from pydantic_settings import BaseSettings
from .utils import get_plugins


class BackendSettings(BaseSettings):
    """
    Settings can be set by setting the environment variables in upper case.
    For example for setting `aiida_workgraph_gui_profile` one has to export
    the evironment variable `AIIDA_WORKGRAPH_GUI_PROFILE`.
    """

    aiida_workgraph_gui_profile: str = ""  # if empty aiida uses default profile


backend_settings = BackendSettings()

app = FastAPI()
manager.get_manager().load_profile(backend_settings.aiida_workgraph_gui_profile)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.get("/api", tags=["root"])
async def read_root() -> dict:
    return {"message": "Welcome to AiiDA-WorkGraph."}


@app.get("/plugins")
async def list_plugins():
    plugins = get_plugins()
    print(f"Found plugins: {plugins.keys()}")
    plugin_names = [plugin_name for plugin_name in plugins.keys()]
    return {"plugins": plugin_names}


def mount_plugins():
    plugins = get_plugins()
    for plugin_name, plugin_module in plugins.items():
        print(f"Mounting plugin: {plugin_name}")
        router = plugin_module["router"]
        static_dir = plugin_module["static_dir"]
        if router is None or static_dir is None:
            continue

        # 1) Plugin API mounted at /plugins/{plugin_name}/api
        app.include_router(router, prefix=f"/plugins/{plugin_name}")

        # 2) Serve plugin static ESM at /plugins/{plugin_name}/static
        app.mount(
            f"/plugins/{plugin_name}/static",
            StaticFiles(directory=static_dir, html=True),
            name=f"plugin_{plugin_name}",
        )


app.include_router(workchain_router)
app.include_router(task_router)
app.include_router(process_router)
app.include_router(datanode_router)
app.include_router(groupnode_router)
app.include_router(daemon_router)
mount_plugins()


@app.get("/debug")
async def debug() -> dict:
    return {"loaded_aiida_profile": manager.get_manager().get_profile()}


@app.get("/backend-setting")
async def backend_settings():
    return backend_settings


# Integrating React build into a FastAPI application and serving the build (HTML, CSS, JavaScript) as static files
"""
When navigate to http://127.0.0.1:8000/settings from http://127.0.0.1:8000/ using client-side
routing (i.e., links within your React app), the React Router handles the route /settings
without reloading the page from the server. This is why it works.
However, when you refresh the page at http://127.0.0.1:8000/settings, the browser makes
a request to the FastAPI server for /settings. Since this route isn't defined in FastAPI
(it's a client-side route), the server returns a 404 Not Found error.
so we use the index.html serve all routes except API specific ones, then load all static assets.
"""
backend_dir = Path(__file__).parent
build_dir = backend_dir / "../../frontend/build/"
build_dir = os.getenv("REACT_BUILD_DIR", build_dir)


@app.exception_handler(StarletteHTTPException)
async def _spa_server(req: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return FileResponse(f"{build_dir}/index.html", media_type="text/html")
    else:
        return await http_exception_handler(req, exc)


if os.path.isdir(build_dir):
    app.mount(
        "/static/",
        StaticFiles(directory=build_dir / "static"),
        name="React app static files",
    )

    @app.get("/react-shim.js", include_in_schema=False)
    async def react_shim():
        path = build_dir / "react-shim.js"
        if not path.is_file():
            raise StarletteHTTPException(status_code=404, detail="shim missing")
        return FileResponse(path, media_type="application/javascript")

    @app.get("/react-jsx-runtime-shim.js", include_in_schema=False)
    async def react_jsx_runtime_shim():
        return FileResponse(
            build_dir / "react-jsx-runtime-shim.js", media_type="application/javascript"
        )
