@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Бюропереводчик

echo.
echo  БЮРОПЕРЕВОДЧИК
echo  --------------------------------
echo  1. Открыть сайт в браузере
echo  2. Запустить сервер разработки (Node.js 20+)
echo.
choice /C 12 /N /M "Выберите режим [1/2]: "
if errorlevel 2 goto dev
if errorlevel 1 goto open

:open
start "" "%~dp0index.html"
exit /b 0

:dev
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20+ не найден. Для быстрого запуска используйте вариант 1.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm не найден. Проверьте установку Node.js.
  pause
  exit /b 1
)
echo.
echo Запускаем Vercel CLI. Для ИИ-режима нужен OPENAI_API_KEY в настройках окружения.
echo При первом запуске Vercel CLI может попросить вход.
start "" http://localhost:3000
call npx --yes vercel@latest dev
pause
