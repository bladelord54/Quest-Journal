@echo off
echo.
echo ===================================
echo   Life Organize - Starting App
echo ===================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo.
    call npm install
    echo.
)

echo Starting Life Organize...
echo.
call npm start
