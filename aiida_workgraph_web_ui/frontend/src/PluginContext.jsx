// File: src/PluginContext.jsx

import React, { createContext, useState, useEffect } from 'react';

// 1) The shape of our context value: { dataViews: { [node_type]: Component } }
export const PluginContext = createContext({
  dataViews: {},
});

/**
 * PluginProvider
 *  - props.pluginNames: array of plugin IDs (e.g. ['plugin1', 'plugin2'])
 *  - At mount or whenever pluginNames changes, we import each plugin
 *    bundle (via webpackIgnore: true), read its default export, and
 *    grab plugin.dataView (an object mapping node_type → Component).
 *  - We merge all plugins’ dataView objects into one single “views” map,
 *    and store it in state as dataViews.
 */
export function PluginProvider({ pluginNames, children }) {
  const [dataViews, setDataViews] = useState({});

  useEffect(() => {
    if (!pluginNames || pluginNames.length === 0) {
      setDataViews({});
      return;
    }

    let cancelled = false;

    async function loadAllDataViews() {
      const merged = {};
      for (const name of pluginNames) {
        try {
          // Dynamically import the plugin bundle:
          const mod = await import(
            /* webpackIgnore: true */ `/plugins/${name}/static/${name}.esm.js`
          );

          // We expect the plugin to default-export an object like:
          // { id, title, version, description, route: ..., dataView: { 'data.core.dict.Dict.': DictItem, ... } }
          const pluginDef = mod.default;
          if (pluginDef && pluginDef.dataView) {
            Object.assign(merged, pluginDef.dataView);
          }
        } catch (err) {
          console.error(`Failed to load dataView from plugin "${name}":`, err);
        }
      }

      if (!cancelled) {
        setDataViews(merged);
      }
    }

    loadAllDataViews();

    return () => {
      cancelled = true;
    };
  }, [pluginNames]);

  return (
    <PluginContext.Provider value={{ dataViews }}>
      {children}
    </PluginContext.Provider>
  );
}
