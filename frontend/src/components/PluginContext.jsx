import React, { createContext, useState, useEffect, useContext } from 'react';

// Context includes dataViews, routes
const PluginContext = createContext({
  dataViews: {},
  routes: {},
});

/**
 * PluginProvider: dynamically imports plugins, merges dataViews & routes
 */
export function PluginProvider({ pluginNames, children }) {
  const [dataViews, setDataViews] = useState({});
  const [routes, setRoutes] = useState({});
  const [homeItems, setHomeItems] = useState({});
  const [sideBarItems, setSideBarItems] = useState({});

  useEffect(() => {
    if (!pluginNames || pluginNames.length === 0) {
      setDataViews({});
      setRoutes({});
      setHomeItems({});
      setSideBarItems({});
      return;
    }

    let cancelled = false;

    async function loadPlugins() {
      const mergedDataViews = {};
      const mergedRoutes = {};
      const mergedHomeItems = {};
      const mergedSideBarItems = {};

      for (const name of pluginNames) {
        try {
          const mod = await import(
            /* webpackIgnore: true */ `/plugins/${name}/static/${name}.esm.js`
          );
          const def = mod.default || mod;
          if (def.dataView) Object.assign(mergedDataViews, def.dataView);
          if (def.routes)   Object.assign(mergedRoutes,   def.routes);
          if (def.homeItems) Object.assign(mergedHomeItems, def.homeItems);
          if (def.sideBarItems) Object.assign(mergedSideBarItems, def.sideBarItems);
        } catch (err) {
          console.error(`Failed to load plugin "${name}":`, err);
        }
      }

      if (!cancelled) {
        setDataViews(mergedDataViews);
        setRoutes(mergedRoutes);
        setHomeItems(mergedHomeItems);
        setSideBarItems(mergedSideBarItems);
      }
    }

    loadPlugins();
    return () => { cancelled = true; };
  }, [pluginNames]);

  return (
    <PluginContext.Provider value={{ dataViews, routes, homeItems, sideBarItems }}>
      {children}
    </PluginContext.Provider>
  );
}

/**
 * Hook to consume plugin context
 */
export function usePluginContext() {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('usePluginContext must be used within PluginProvider');
  return ctx;
}
