Developing an AiiDA-GUI Plugin
==============================

A plugin for AiiDA-GUI consists of two halves:

1.  **Python “backend”** that registers routers and static assets.
2.  **JavaScript “frontend”** that exports metadata (routes, menu items, components).

Below is a minimal example based on the **aiida-gui-workgraph** plugin.

1. Declare your plugin in ``pyproject.toml``
--------------------------------------------

Let AiiDA discover your plugin via an entry point under the
``aiida_gui.plugins`` group:

.. code-block:: toml

  [project.entry-points."aiida_gui.plugins"]
  workgraph = "aiida_gui_workgraph:plugin"

Here, **workgraph** is the plugin’s name, and
``aiida_gui_workgraph:plugin`` must export a dict describing your
plugin.

2. Backend: register routers & serve your built frontend
--------------------------------------------------------

In your Python package (e.g. ``aiida_gui_workgraph``):

.. code-block:: python

  # aiida_gui_workgraph/__init__.py

  import pathlib
  from .workgraph import router as workgraph_router
  from .scheduler import router as scheduler_router

  __version__ = "0.1.0"

  THIS_DIR   = pathlib.Path(__file__).parent
  static_dir = str(THIS_DIR / "static")

  plugin = {
      # API routers mounted under /plugins/{key}
      "routers": {
          "workgraph": workgraph_router,
          "scheduler":  scheduler_router,
      },
      # Human-readable plugin name
      "name": "WorkGraph",
      # Directory to serve static ESM bundles & index.html
      "static_dirs": {
          "workgraph": static_dir,
      },
  }


3. Frontend build: bundle your React code to ESM
------------------------------------------------

Create a simple build script (e.g. ``plugins/workgraph/build-plugin.js``) using esbuild:

.. code-block:: javascript

  // build-plugin.js
  const esbuild = require("esbuild");
  const path    = require("path");

  const entry   = path.resolve(__dirname, "src/index.js");
  const outfile = path.resolve(
    __dirname,
    "../aiida_gui_workgraph/static/workgraph.esm.js"
  );

  esbuild.build({
    entryPoints: [entry],
    bundle:       true,
    format:       "esm",
    platform:     "browser",
    outfile,
    sourcemap:    false,
    loader:       { ".js":"jsx", ".jsx":"jsx" },
    jsxFactory:   "React.createElement",
    jsxFragment:  "React.Fragment",
    external: [
      "react","react-dom","react-dom/client","react/jsx-runtime",
      "react-router-dom","use-sync-external-store",
      "use-sync-external-store/shim",
    ],
    banner: {
      js: `
        // Shim CJS-style require() to use window globals
        var require = function(name) {
          if (name === 'react')                 return window.React;
          if (name === 'react-dom')             return window.ReactDOM;
          if (name === 'react-dom/client')      return window.ReactDOM;
          if (name === 'react/jsx-runtime')     return window.React;
          if (name === 'use-sync-external-store'
              || name === 'use-sync-external-store/shim')
                                            return { useSyncExternalStore: window.React.useSyncExternalStore };
          throw new Error('Cannot require \"' + name + '\"');
        };
      `
    }
  }).catch((err)=>{
    console.error(err);
    process.exit(1);
  });

In your plugin’s ``package.json``:

.. code-block:: json

  {
    "name": "plugin1-frontend-build",
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "build": "node build-plugin.js"
    },
    "devDependencies": {
      "esbuild": "^0.18.17"
    },
    "dependencies": {
      "react": "...",
      "@mui/material": "...",
      // …your runtime deps…
    }
  }

After ``npm run build``, you’ll get:

``aiida_gui_workgraph/static/workgraph.esm.js``

4. Frontend metadata: ``src/index.js``
---------------------------------------

Your entry point must default‐export a **plugin** object, for example:

.. code-block:: javascript

  // plugins/workgraph/src/index.js

  import WorkGraphTable  from "./WorkGraphTable";
  import WorkGraphItem   from "./WorkGraphItem";
  import SchedulerTable  from "./SchedulerTable";
  import SchedulerDetail from "./SchedulerDetail";
  import { faProjectDiagram, faClock }
    from "@fortawesome/free-solid-svg-icons";

  const plugin = {
    id:          "workgraph",
    title:       "WorkGraph",
    version:     "0.1.0",
    description: "AiiDA GUI WorkGraph plugin",

    // Sidebar links under “Plugins”
    sideBarItems: {
      workgraph: {
        label: "WorkGraph",
        path:  "/workgraph",
        icon:  faProjectDiagram,
      },
      scheduler: {
        label: "Scheduler",
        path:  "/scheduler",
        icon:  faClock,
      },
    },

    // Home page quick‐links
    homeItems: {
      workgraph: { label: "WorkGraph", path: "/workgraph" },
      scheduler: { label: "Scheduler", path: "/scheduler" },
    },

    // React-Router routes → components
    routes: {
      "/workgraph":           WorkGraphTable,
      "/workgraph/:pk/*":     WorkGraphItem,
      "/scheduler":           SchedulerTable,
      "/scheduler/:name":     SchedulerDetail,
    },

    // (optional) data view handlers, icons, etc.
    dataView: {},
  };

  export default plugin;

5. Putting it all together
--------------------------

1.  **Install the Python package**:

    .. code-block:: bash

       pip install -e .

2.  **Build the front end**:

    .. code-block:: bash

       cd frontend
       npm install
       npm run build
