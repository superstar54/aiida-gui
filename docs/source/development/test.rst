=============
Running tests
=============

For running the tests, you only need to start RabbitMQ in the background.
The profile that is created during the tests will automatically check its configuration.
To run all tests, use:

.. code-block:: console

    pytest

To run only backend tests, run:

.. code-block:: console

    pytest -m backend

To run only frontend tests, run:

.. code-block:: console

    pytest -m frontend

To skip these tests, you can use the markers in the following way:

.. code-block:: console

    pytest -m "not backend and not frontend"

Running frontend tests in headed mode
-------------------------------------

To debug the frontend tests, you often want to see what happens in the tests.
By default, they are run in headless mode, so no browser is shown.
To run the frontend tests in headed mode, set an environment variable like this:

.. code-block:: console

    PYTEST_PLAYWRIGHT_HEADLESS=no pytest -m frontend

For the frontend tests, we start a web server at port ``8000``. Please make sure this address is free before running the frontend tests.

Development on the GUI
======================

For the development on the GUI, we use the `React <https://react.dev>`_ library,
which can automatically refresh on changes to the JS files. To start the backend
server, run:

.. code-block:: console

    python aiida_gui/main.py

Then start the frontend server with:

.. code-block:: console

    npm --prefix aiida_gui/frontend start

The frontend server will refresh automatically.

Tools for writing frontend tests
--------------------------------

To determine the right commands for invoking DOM elements, Playwright offers a
tool that outputs commands while navigating through the GUI. It requires a
web server to be running, so it can be started with:

.. code-block:: console

    aiida-gui start
    playwright codegen

Troubleshooting
===============

Tests are not updating after changes in code
--------------------------------------------

You might want to clean your cache:

.. code-block:: console

    npm --prefix aiida_gui/frontend cache clean

Also clear your browser's cache or try starting a new private window.
