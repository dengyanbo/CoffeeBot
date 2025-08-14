# Coffee Bot Deployment Script
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$BotAppId,
    
    [Parameter(Mandatory=$true)]
    [string]$BotAppPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$BaristaAadId,
    
    [string]$DailyAmQuota = "15",
    [string]$DailyPmQuota = "15"
)

Write-Host "🚀 Starting Coffee Bot deployment..." -ForegroundColor Green

# Check if logged into Azure
$context = Get-AzContext
if (!$context) {
    Write-Host "❌ Please login to Azure first using 'Connect-AzAccount'" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Connected to Azure as: $($context.Account.Id)" -ForegroundColor Green

# Deploy infrastructure
Write-Host "🏗️ Deploying Azure resources..." -ForegroundColor Yellow
$deployment = New-AzResourceGroupDeployment `
    -ResourceGroupName $ResourceGroupName `
    -TemplateFile "deploy.bicep" `
    -botAppId $BotAppId `
    -botAppPassword $BotAppPassword `
    -baristaAadId $BaristaAadId `
    -dailyAmQuota $DailyAmQuota `
    -dailyPmQuota $DailyPmQuota `
    -Verbose

if ($deployment.ProvisioningState -eq "Succeeded") {
    Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green
    
    $functionAppName = $deployment.Outputs.functionAppName.Value
    $messagingEndpoint = $deployment.Outputs.messagingEndpoint.Value
    
    Write-Host "📱 Function App Name: $functionAppName" -ForegroundColor Cyan
    Write-Host "🔗 Messaging Endpoint: $messagingEndpoint" -ForegroundColor Cyan
    
    # Build the project
    Write-Host "🔨 Building TypeScript project..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build completed successfully!" -ForegroundColor Green
        
        # Deploy function code
        Write-Host "📦 Deploying function code..." -ForegroundColor Yellow
        func azure functionapp publish $functionAppName --typescript
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Function code deployed successfully!" -ForegroundColor Green
            
            Write-Host ""
            Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "📋 Next Steps:" -ForegroundColor Yellow
            Write-Host "1. Update your Bot Channel Registration messaging endpoint to:" -ForegroundColor White
            Write-Host "   $messagingEndpoint" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "2. Update manifest.json with your Bot App ID:" -ForegroundColor White
            Write-Host "   Replace 'YOUR_BOT_APP_ID' with: $BotAppId" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "3. Create a Teams app package and install in your team" -ForegroundColor White
            Write-Host ""
            Write-Host "4. Test by typing '@CoffeeBot order' in Teams!" -ForegroundColor White
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        } else {
            Write-Host "❌ Function deployment failed!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Infrastructure deployment failed!" -ForegroundColor Red
    Write-Host $deployment.Error -ForegroundColor Red
    exit 1
}
