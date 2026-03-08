@echo off
echo === Codex OAuth Login (ChatGPT) ===
echo.
echo This will open a browser for ChatGPT authentication.
echo The web app will use this session for ALL users.
echo.
python "%~dp0codex_login.py" --device-auth
echo.
pause
