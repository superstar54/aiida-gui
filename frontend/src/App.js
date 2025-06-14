import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './components/Home';
import DataNodeTable from './components/DataNodeTable';
import GroupNodeTable from './components/GroupNodeTable';
import GroupNodeDetail from './components/GroupNodeDetail';
import { ProcessTable } from './components/ProcessTable';
import ProcessNodeDetail from './components/ProcessItem';
import WorkFlowItem from './components/WorkFlowItem';
import DataNodeItem from './components/DataNodeItem';
import Daemon from './components/Daemon';
import Layout from './components/Layout';
import hostComponents from './HostComponents'; // Import the host components

import { PluginProvider, usePluginContext } from './components/PluginContext';

import './App.css';

function NotFound() {
  return <div>Sorry, that page doesn’t exist.</div>;
}

function AppContent({error }) {
  // Re-render when plugin routes update
  const { routes } = usePluginContext();
  const { sideBarItems } = usePluginContext();
  const { homeItems } = usePluginContext();

  return (
    <Layout>
      {error && (
        <div style={{ color: 'red' }}>
          Error loading plugins: {error.message}
        </div>
      )}

      <Suspense fallback={<div>Loading page…</div>}>
        <Routes>
          {/* Built-in AiiDA GUI routes */}
          <Route path="/" element={<Home/>} />
          <Route path="/process" element={<ProcessTable />} />
          <Route path="/process/:pk/*" element={<ProcessNodeDetail />} />
          <Route path="/daemon" element={<Daemon />} />
          <Route path="/workchain/:pk/*" element={<WorkFlowItem endPoint="/api/workchain" />} />
          <Route path="/datanode" element={<DataNodeTable />} />
          <Route path="/datanode/:pk" element={<DataNodeItem />} />
          <Route path="/groupnode" element={<GroupNodeTable />} />
          <Route path="/groupnode/:pk" element={<GroupNodeDetail />} />

          {/* Dynamically-injected plugin routes with host components */}
          {Object.entries(routes).map(([fullPath, PluginComponent]) => {
            const relative = fullPath.replace(/^\//, '');
            return (
              <Route
                key={fullPath}
                path={relative}
                element={<PluginComponent {...hostComponents} />}
              />
            );
          })}

          {/* 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const [pluginNames, setPluginNames] = useState(null);
  const [error, setError] = useState(null);

  // Fetch installed plugin IDs once
  useEffect(() => {
    fetch('/plugins')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setPluginNames(data.plugins || []))
      .catch((err) => {
        console.error('Failed to load plugin list:', err);
        setError(err);
        setPluginNames([]);
      });
  }, []);

  if (pluginNames === null) {
    return <div>Loading plugin list…</div>;
  }

  return (
    <Router>
      <PluginProvider pluginNames={pluginNames}>
        <AppContent pluginNames={pluginNames} error={error} />
      </PluginProvider>
    </Router>
  );
}
