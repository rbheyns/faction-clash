@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Faction Clash - Local Server
echo ============================================
echo.

set PYEXE=

REM --- Try "py" first: on Windows this is the real Python launcher.
REM --- "python" is checked after it because Windows often ships a fake
REM --- "python.exe" stub (a Microsoft Store app-execution-alias) that
REM --- shows up fine in "where python" but doesn't actually run Python.
for %%C in (py python3 python) do (
    if "!PYEXE!"=="" (
        where %%C >nul 2>nul
        if !errorlevel!==0 (
            %%C --version >nul 2>nul
            if !errorlevel!==0 set PYEXE=%%C
        )
    )
)

REM --- If PATH lookup found nothing usable, check common install folders ---
if "%PYEXE%"=="" (
    for %%D in (
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
        "C:\Python310\python.exe"
        "C:\Python39\python.exe"
    ) do (
        if "!PYEXE!"=="" (
            if exist %%D set PYEXE=%%D
        )
    )
)

if "%PYEXE%"=="" (
    echo Could not find a working Python install anywhere on this computer.
    echo.
    echo Try running this directly in Command Prompt:
    echo.
    echo     py -m http.server 8000
    echo.
    echo If even that says "not recognized," reinstall from
    echo https://www.python.org/downloads/ and tick "Add python.exe to PATH"
    echo on the first setup screen.
    echo.
    pause
    goto :eof
)

echo Using: %PYEXE%
echo.
echo Once it's running, open this in your browser:
echo.
echo     http://localhost:8000/index.html
echo.
echo Leave this window open while you play/test.
echo Press Ctrl+C here (then Y, Enter) to stop the server.
echo ============================================
echo.

"%PYEXE%" -m http.server 8000
pause
