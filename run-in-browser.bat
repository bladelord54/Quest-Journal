@echo off
echo.
echo ===================================
echo   Life Organize - Browser Mode
echo ===================================
echo.
echo The app is an ES-module build and must be served over http (file:// blocks module scripts).
echo Starting a local server on http://localhost:8000 and opening it in your default browser...
echo Press Ctrl+C to stop the server.
echo.
start http://localhost:8000
python -m http.server 8000
