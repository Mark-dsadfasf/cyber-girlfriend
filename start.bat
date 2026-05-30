@echo off
chcp 65001 >nul
echo ========================================
echo       赛博女友 - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 检查 MINIMAX_API_KEY...
if "%MINIMAX_API_KEY%"=="" (
    echo 警告: 未设置 MINIMAX_API_KEY 环境变量！
    echo 对话功能将无法使用，请先设置:
    echo   set MINIMAX_API_KEY=你的API密钥
    echo.
    pause
)

echo [2/2] 启动后端服务 (3001端口)...
start "赛博女友-后端" cmd /k "cd /d "%~dp0" && node server.js"
timeout /t 2 /nobreak >nul

echo [3/3] 启动前端服务 (3000端口)...
start "赛博女友-前端" cmd /k "cd /d "%~dp0" && npx vite"

echo.
echo 启动完成！浏览器将自动打开 http://localhost:3000
echo.
pause
