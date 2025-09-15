# PowerShell deployment script for VAT Tracker

Write-Host "Building VAT Tracker for production..." -ForegroundColor Green

# 1. Build the application
npm run build

# 2. Create a _redirects file for Vercel to handle client-side routing
$redirectsContent = "/* /index.html 200"
Set-Content -Path "./dist/_redirects" -Value $redirectsContent
Write-Host "Created _redirects file for client-side routing" -ForegroundColor Green

# 3. Copy vercel.json to the dist folder
Copy-Item -Path "./vercel.json" -Destination "./dist/vercel.json"
Write-Host "Copied vercel.json to dist folder" -ForegroundColor Green

# 4. Create a deployment package
Compress-Archive -Path "./dist/*" -DestinationPath "./vat-tracker-deployment.zip" -Force
Write-Host "Created deployment package: vat-tracker-deployment.zip" -ForegroundColor Green

Write-Host "\nDeployment package ready!" -ForegroundColor Green
Write-Host "Upload vat-tracker-deployment.zip to Vercel or use the Vercel CLI to deploy." -ForegroundColor Yellow
Write-Host "\nRemember to check the deployment-troubleshooting.md file for additional configuration steps." -ForegroundColor Yellow