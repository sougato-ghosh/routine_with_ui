@echo off
echo Building Cadence for Windows...

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js.
    pause
    exit /b 1
)

echo Installing Backend Dependencies...
pip install -r backend/requirements.txt pyinstaller

echo Building Frontend...
cd frontend
call npm install
call npm run build
cd ..

echo Preparing Static Files...
mkdir backend\static >nul 2>&1
xcopy /E /Y frontend\dist\* backend\static\

echo Creating Executable...
:: Create a single folder bundle for better stability with OR-Tools and other native libs
pyinstaller --noconfirm --onedir --windowed ^
    --add-data "backend;backend" ^
    --add-data "backend/static;backend/static" ^
    --hidden-import "uvicorn.protocols.http.httptools_impl" ^
    --hidden-import "uvicorn.protocols.http.h11_impl" ^
    --hidden-import "uvicorn.protocols.websockets.websockets_impl" ^
    --hidden-import "uvicorn.protocols.websockets.wsproto_impl" ^
    --hidden-import "uvicorn.loop.auto" ^
    --hidden-import "uvicorn.loop.asyncio" ^
    --hidden-import "uvicorn.logging" ^
    --name "Cadence" ^
    launcher.py

echo.
echo Build Complete! Look in the 'dist/Cadence' folder for Cadence.exe
pause
