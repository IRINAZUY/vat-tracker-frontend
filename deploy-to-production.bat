@echo off
echo ===================================================
echo VAT Tracker - One-Click Production Deployment Tool
echo ===================================================
echo.

echo Step 1: Building and packaging application...
echo.

PowerShell -NoProfile -ExecutionPolicy Bypass -Command ".\deploy.ps1"

echo.
echo Step 2: Deployment package created successfully!
echo.
echo The file 'vat-tracker-deployment.zip' is now ready for upload to Vercel.
echo.
echo What would you like to do next?
echo.
echo 1. Open Vercel dashboard (to manually upload the zip file)
echo 2. Open the production deployment guide
echo 3. Exit
echo.

set /p choice=Enter your choice (1, 2, or 3): 

if "%choice%"=="1" start https://vercel.com/dashboard
if "%choice%"=="2" start .\production-deployment-guide.md
if "%choice%"=="3" exit

echo.
echo Remember to check the production-deployment-guide.md for detailed instructions.
echo.

pause