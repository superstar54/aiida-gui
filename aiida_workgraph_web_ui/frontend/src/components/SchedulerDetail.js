import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

// Import Chart.js components and plugins
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

import { Line } from 'react-chartjs-2';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

export default function SchedulerDetail() {
  const { name } = useParams();
  const [scheduler, setScheduler] = useState(null);

  // Time series data
  const [runningProcessData, setRunningProcessData] = useState([]);
  const [waitingProcessData, setWaitingProcessData] = useState([]);
  const [calcjobData, setCalcjobData] = useState([]);

  // Inline editing states
  const [maxCalcjobsEdit, setMaxCalcjobsEdit] = useState('');
  const [maxProcessesEdit, setMaxProcessesEdit] = useState('');
  // Dirty flags to prevent overwriting user input while typing
  const [maxCalcjobsDirty, setMaxCalcjobsDirty] = useState(false);
  const [maxProcessesDirty, setMaxProcessesDirty] = useState(false);

  // Refresh interval & chart size
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [chartSize, setChartSize] = useState('small');

  // Define widths/heights for chart sizes
  const chartWidths = { small: 400, medium: 700, large: 1000 };
  const chartHeights = { small: 300, medium: 500, large: 700 };
  const chartWidth = chartWidths[chartSize];
  const chartHeight = chartHeights[chartSize];

  const chartFlexWidth = chartWidth; // or chartWidth + 20

  const processChartRef = useRef(null);
  const calcjobChartRef = useRef(null);

  // Chart options
  const processChartOptions = {
    responsive: false,
    plugins: {
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'second' },
      },
      y1: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: (value) => Math.round(value),
        },
        title: { display: true, text: 'Running Processes' },
      },
      y2: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: (value) => Math.round(value),
        },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Waiting Processes' },
      },
    },
  };

  const calcjobChartOptions = {
    responsive: false,
    plugins: {
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { tooltipFormat: 'HH:mm:ss', unit: 'second' },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: (value) => Math.round(value),
        },
        title: { display: true, text: 'Running Calcjobs' },
      },
    },
  };

  const fetchScheduler = () => {
    fetch(`http://localhost:8000/api/scheduler/status/${name}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch scheduler ${name} status.`);
        }
        return response.json();
      })
      .then((data) => {
        setScheduler(data);
        if (!maxCalcjobsDirty) {
          setMaxCalcjobsEdit(data.max_calcjobs);
        }
        if (!maxProcessesDirty) {
          setMaxProcessesEdit(data.max_processes);
        }
        const currentTime = Date.now();
        setRunningProcessData((prev) =>
          [...prev, { x: currentTime, y: data.running_process_count }].slice(-20)
        );
        setWaitingProcessData((prev) =>
          [...prev, { x: currentTime, y: data.waiting_process_count }].slice(-20)
        );
        setCalcjobData((prev) =>
          [...prev, { x: currentTime, y: data.running_calcjob_count }].slice(-20)
        );
      })
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    fetchScheduler();
    const interval = setInterval(fetchScheduler, refreshInterval);
    return () => clearInterval(interval);
  }, [name, refreshInterval, maxCalcjobsDirty, maxProcessesDirty]);

  // Update limit calls
  const updateMaxCalcjobs = () => {
    fetch('http://localhost:8000/api/scheduler/set_max_calcjobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_calcjobs: parseInt(maxCalcjobsEdit, 10),
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to update max calcjobs.');
        return response.json();
      })
      .then((data) => {
        toast.success('Max calcjobs updated.');
        setScheduler(data);
      })
      .catch((error) => toast.error(error.message));
  };

  const updateMaxProcesses = () => {
    fetch('http://localhost:8000/api/scheduler/set_max_processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        max_processes: parseInt(maxProcessesEdit, 10),
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to update max processes.');
        return response.json();
      })
      .then((data) => {
        toast.success('Max processes updated.');
        setScheduler(data);
      })
      .catch((error) => toast.error(error.message));
  };

  // Chart data
  const processChartData = {
    datasets: [
      {
        label: 'Running Processes',
        data: runningProcessData,
        fill: false,
        borderColor: 'blue',
        tension: 0.1,
        yAxisID: 'y1',
      },
      {
        label: 'Waiting Processes',
        data: waitingProcessData,
        fill: false,
        borderColor: 'orange',
        tension: 0.1,
        yAxisID: 'y2',
      },
    ],
  };

  const calcjobChartData = {
    datasets: [
      {
        label: 'Running Calcjobs',
        data: calcjobData,
        fill: false,
        borderColor: 'green',
        tension: 0.1,
      },
    ],
  };

  if (!scheduler) {
    return <div>Loading scheduler details...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Scheduler: {scheduler.name}</h2>

      {/* Overview Section */}
      <div
        style={{
          background: '#f9f9f9',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0px 0px 10px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ marginBottom: '10px' }}>Overview</h3>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Status:</strong> {scheduler.running ? 'Running' : 'Stopped'}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Waiting Processes:</strong> {scheduler.waiting_process_count}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Running Processes:</strong>{' '}
              {scheduler.running_process_count}/{scheduler.max_processes || 0}
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Running Calcjobs:</strong>{' '}
              {scheduler.running_calcjob_count}/{scheduler.max_calcjobs || 0}
            </p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Max Calcjobs:</strong>{' '}
              <input
                name="maxCalcjobs"
                type="number"
                value={maxCalcjobsEdit}
                onFocus={() => setMaxCalcjobsDirty(true)}
                onBlur={() => {
                  setMaxCalcjobsDirty(false);
                  updateMaxCalcjobs();
                }}
                onChange={(e) => setMaxCalcjobsEdit(e.target.value)}
                style={{ width: '80px', marginRight: '5px' }}
              />
            </p>
            <p style={{ margin: '6px 0' }}>
              <strong>Max Processes:</strong>{' '}
              <input
                name="maxProcesses"
                type="number"
                value={maxProcessesEdit}
                onFocus={() => setMaxProcessesDirty(true)}
                onBlur={() => {
                  setMaxProcessesDirty(false);
                  updateMaxProcesses();
                }}
                onChange={(e) => setMaxProcessesEdit(e.target.value)}
                style={{ width: '80px', marginRight: '5px' }}
              />
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          background: '#eaeaea',
          padding: '10px',
          borderRadius: '8px',
        }}
      >
        <div>
          <label style={{ marginRight: '5px' }}>Refresh Interval:</label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={1000}>1 sec</option>
            <option value={3000}>3 sec</option>
            <option value={5000}>5 sec</option>
            <option value={30000}>30 sec</option>
          </select>
        </div>
        <div>
          <label style={{ marginRight: '5px' }}>Chart Size:</label>
          <select value={chartSize} onChange={(e) => setChartSize(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>

      {/* Chart Row (flex container, wrapping) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'flex-start',
          marginBottom: '30px',
        }}
      >
        {/* Process Chart Section */}
        <div
          style={{
            flex: `0 0 ${chartFlexWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <h4 style={{ margin: 0 }}>Processes (Running & Waiting)</h4>
          </div>
          <Line
            key={`process-chart-${chartSize}`}
            ref={processChartRef}
            data={processChartData}
            options={processChartOptions}
            width={chartWidth}
            height={chartHeight}
          />
        </div>

        {/* Calcjob Chart Section */}
        <div
          style={{
            flex: `0 0 ${chartFlexWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <h4 style={{ margin: 0 }}>Running Calcjobs</h4>
          </div>
          <Line
            key={`calcjob-chart-${chartSize}`}
            ref={calcjobChartRef}
            data={calcjobChartData}
            options={calcjobChartOptions}
            width={chartWidth}
            height={chartHeight}
          />
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
