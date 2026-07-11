@echo off
setlocal

REM ============================================================
REM  deploy-diagrammind.bat
REM  Double-click this file any time to push the current code in
REM  this folder live to https://diagrammind.vercel.app
REM
REM  What it does, in order:
REM    1. Type-checks the project (catches broken code before it
REM       ever reaches the live site)
REM    2. If that passes, deploys to Vercel production
REM    3. Prints a clear PASSED/FAILED message and waits for you to
REM       press a key, so the window doesn't disappear before you
REM       can read the result
REM ============================================================

cd /d "E:\1.Semester 262\CSE499"

echo.
echo ============================================
echo   DiagramMind — Deploy to Vercel
echo ============================================
echo.
echo [1/2] Type-checking...
echo.

call "%USERPROFILE%\.bun\bin\bun.exe" x tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================
    echo   FAILED — TypeScript errors above.
    echo   Nothing was deployed. Fix the errors and
    echo   run this file again.
    echo ============================================
    echo.
    pause
    exit /b 1
)

echo.
echo Type-check passed.
echo.
echo [2/2] Deploying to Vercel production...
echo.

call "%USERPROFILE%\.bun\bin\bun.exe" x vercel deploy --prod --yes

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================
    echo   FAILED — Vercel deploy did not succeed.
    echo   See the output above for the reason.
    echo ============================================
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   DONE — live at https://diagrammind.vercel.app
echo ============================================
echo.
pause
