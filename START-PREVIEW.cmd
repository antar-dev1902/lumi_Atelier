@echo off
cd /d "%~dp0"
if not exist node_modules\vite\bin\vite.js (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run build
if errorlevel 1 exit /b 1
echo Open http://127.0.0.1:4174 in your browser.
node server/index.mjs
