@echo off
setlocal
cd /d "%~dp0"
title SportMatch - Local Launcher

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install the current LTS version from https://nodejs.org/ then reopen this file.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS and reopen this file.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: package.json was not found.
  echo Make sure this file is inside the SportMatchApp folder.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
  echo Vite is missing. Installing or repairing project dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency installation failed. Check the error above, internet connection, and try again.
    pause
    exit /b 1
  )
)

if not exist "node_modules\.bin\vite.cmd" (
  echo ERROR: Vite is still missing after npm install.
  echo Open Command Prompt in this folder and run: npm install
  pause
  exit /b 1
)

echo Starting SportMatch. Keep this window open while using the app.
echo Stop the server by pressing Ctrl+C.
echo.
call npm run dev
if errorlevel 1 (
  echo.
  echo The development server stopped with an error. Read the message above.
)
pause
