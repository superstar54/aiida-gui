import sys
import traceback
from fastapi.staticfiles import StaticFiles


def get_plugins():
    import importlib.metadata

    plugins = {}

    try:
        eps = importlib.metadata.entry_points()
        if sys.version_info >= (3, 10):
            eps = eps.select(group="aiida_gui.plugins")
        else:
            eps = eps.get("aiida_gui.plugins", [])
    except Exception:
        print("Failed to get entry points")
        return plugins

    for entry in eps:
        plugin_name = entry.name
        try:
            plugin_module = entry.load()
            plugins[plugin_name] = plugin_module
        except Exception as e:
            print(traceback.format_exc())
            print(f"Failed to load plugin {plugin_name}: {e}")
            continue

    return plugins


def mount_plugins(app):
    plugins = get_plugins()
    for plugin_name, plugin_module in plugins.items():
        routers = plugin_module.get("routers")
        static_dir = plugin_module.get("static_dir")
        if routers is None or static_dir is None:
            continue

        for router in routers:
            app.include_router(router, prefix=f"/plugins/{plugin_name}")

        app.mount(
            f"/plugins/{plugin_name}/static",
            StaticFiles(directory=static_dir, html=True),
            name=f"plugin_{plugin_name}",
        )
