@echo off
cd /d "%~dp0"
start "Panel Comercial Server" cmd /k "cd /d %~dp0 && npm start"
timeout /t 3 /nobreak >nul
start "" http://localhost:3000
