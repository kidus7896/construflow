@echo off
cd /d "C:\Users\Lenovo\Desktop\antigravity\construction-flow"

echo Stopping any existing server on port 3001...
powershell -Command "Get-CimInstance Win32_Process -Filter 'CommandLine LIKE ''%%node%%server%%index.js%%''' | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting backend server on port 3001...
start "ConstructionFlow-Server" cmd /c "cd /d server && node index.js"

echo Waiting for backend to be ready...
:waitloop
timeout /t 2 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -ErrorAction Stop; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 goto waitloop

echo Backend is ready. Starting frontend dev server...
npm run dev -- --host 0.0.0.0
