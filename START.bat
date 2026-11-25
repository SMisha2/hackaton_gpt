@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Бюрократический переводчик

echo.
echo  БЮРОПЕРЕВОДЧИК
echo  -------------------------------
echo  1. Просто открыть сайт (без установки)
echo  2. Запустить локально вместе с API (Node.js + Vercel CLI)
echo.
choice /C 12 /N /M "Ваш выбор [1/2]: "

if errorlevel 2 goto api
if errorlevel 1 goto browser

:browser
start "" "%~dp0index.html"
exit /b 0

:api
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js не найден. Установите Node.js 20 или новее.
  echo Для обычного запуска выберите вариант 1 или откройте index.html.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm не найден. Переустановите Node.js с npm.
  pause
  exit /b 1
)
echo.
echo Запускается Vercel CLI. При первом запуске может потребоваться установка CLI и вход.
echo Сайт будет доступен по адресу http://localhost:3000
start "" http://localhost:3000
call npm run dev
echo.
pause
