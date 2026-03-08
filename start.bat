@echo off
setlocal
echo === Starting ChatGPT Clone ===

:: First stop any existing instances
call "%~dp0stop.bat"

cd /d "%~dp0"

:: Install dependencies on fresh checkouts before starting Next.js
if not exist "%~dp0node_modules\.bin\next.cmd" (
    echo Installing project dependencies...
    if exist "%~dp0package-lock.json" (
        call npm ci
    ) else (
        call npm install
    )

    if errorlevel 1 (
        echo Dependency installation failed.
        exit /b 1
    )
)

:: Start the dev server on port 3000
echo Starting Next.js on http://localhost:3000 ...
set PORT=3000
call npm run dev
