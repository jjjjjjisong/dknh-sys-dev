@echo off
setlocal

cd /d "%~dp0"

echo Starting Vite dev server on http://127.0.0.1:5173
"C:\Program Files\nodejs\npm.cmd" run dev
