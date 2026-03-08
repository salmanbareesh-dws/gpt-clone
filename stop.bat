@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo === Stopping ChatGPT Clone ===

:: Kill any node processes using port 3000
set "SEEN_PIDS= "
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo !SEEN_PIDS! | find " %%a " >nul
    if errorlevel 1 (
        echo Killing process %%a on port 3000...
        taskkill /PID %%a /F >nul 2>&1
        set "SEEN_PIDS=!SEEN_PIDS!%%a "
    )
)

:: Remove the Next.js dev lock file
if exist ".next\dev\lock" (
    del /f ".next\dev\lock"
    echo Removed .next\dev\lock
)

ping -n 3 127.0.0.1 >nul
echo === Stopped ===
