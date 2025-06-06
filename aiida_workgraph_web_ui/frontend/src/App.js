// File: src/App.js

import React, { Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import DataNodeTable from "./components/DataNodeTable";
import GroupNodeTable from "./components/GroupNodeTable";
import GroupNodeDetail from "./components/GroupNodeDetail";
import { ProcessTable, WorkGraphTable } from "./components/ProcessTable";
import ProcessNodeDetail from "./components/ProcessItem";
import WorkGraphItem from "./components/WorkGraphItem";
import WorkChainItem from "./components/WorkChainItem";
import DataNodeItem from "./components/DataNodeItem";
import Daemon from "./components/Daemon";
import SchedulerList from "./components/SchedulerList";
import SchedulerDetail from "./components/SchedulerDetail";
import Layout from "./components/Layout";

import { PluginProvider } from "./PluginContext"; // ← import our new context provider

import "./App.css";

function lazyPluginComponent(pluginId, exportName) {
  return React.lazy(() =>
    import(/* webpackIgnore: true */ `/plugins/${pluginId}/static/${pluginId}.esm.js`).then(
      (mod) => {
        if (!mod.default || !mod.default[exportName]) {
          throw new Error(`Plugin ${pluginId} did not export ${exportName}`);
        }
        const Component = mod.default[exportName];
        return { default: (props) => <Component {...props} /> };
      }
    )
  );
}

function App() {
  const [pluginNames, setPluginNames] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/plugins")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPluginNames(data.plugins || []);
      })
      .catch((err) => {
        console.error("Failed to load plugin list:", err);
        setError("Could not fetch plugins");
        setPluginNames([]);
      });
  }, []);

  if (pluginNames === null) {
    return <div>Loading plugins…</div>;
  }

  return (
    <Router>
      <div className="App">
        {/**
         * 1) Wrap everything in PluginProvider, passing pluginNames.
         *    PluginProvider will fetch each plugin’s dataView mapping
         *    and make it available in context.
         */}
        <PluginProvider pluginNames={pluginNames}>
          <Layout pluginNames={pluginNames}>
            <Routes>
              <Route path="/workgraph" element={<WorkGraphTable />} />
              <Route path="/process" element={<ProcessTable />} />
              <Route path="/process/:pk/*" element={<ProcessNodeDetail />} />
              <Route path="/daemon" element={<Daemon />} />
              <Route path="/scheduler" element={<SchedulerList />} />
              <Route path="/scheduler/:name" element={<SchedulerDetail />} />
              <Route path="/" element={<Home />} />
              <Route path="/workgraph/:pk/*" element={<WorkGraphItem />} />
              <Route path="/workchain/:pk/*" element={<WorkChainItem />} />
              <Route path="/datanode" element={<DataNodeTable />} />
              <Route path="/datanode/:pk" element={<DataNodeItem />} />
              <Route path="/groupnode" element={<GroupNodeTable />} />
              <Route path="/groupnode/:pk" element={<GroupNodeDetail />} />

              {pluginNames.map((name) => {
                // Create a React-lazy component that expects the plugin to export a "route" component:
                const PluginRouteComponent = lazyPluginComponent(name, "route");
                return (
                  <Route
                    key={name}
                    path={`/${name}`}
                    element={
                      <Suspense fallback={<div>Loading plugin…</div>}>
                        <PluginRouteComponent />
                      </Suspense>
                    }
                  />
                );
              })}
            </Routes>
          </Layout>
        </PluginProvider>
      </div>
    </Router>
  );
}

export default App;
