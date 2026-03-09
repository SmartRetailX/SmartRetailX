@echo off
cd "%~dp0"

call .venv\Scripts\activate.bat

REM Run the app using the FastAPI CLI command
call fastapi dev app\main.py --port 8003

pause