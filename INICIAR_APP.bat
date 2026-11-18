@echo off
title ElectroPlan AR - Arranque Local
echo ========================================================
echo   ElectroPlan AR - Ley 10281 ^& AEA 90364-7-770
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] No se encontro Node.js instalado en esta PC.
    echo Descarga e instala Node.js LTS desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/2] Instalando dependencias por primera vez ^(npm install^)...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Dependencias ya instaladas.
)

echo.
echo [2/2] Iniciando servidor de la aplicacion en http://localhost:3000 ...
echo       Cuando veas "Ready", abri http://localhost:3000 en tu navegador.
echo       (Deja esta ventana abierta mientras uses la app)
echo.
start "" http://localhost:3000
call npm run dev
pause
