# ☕ Coffee Bot Setup Guide

## Quick Start Checklist

### 1. 🔧 Prerequisites Setup

```bash
# Install Azure CLI
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Install Node.js 18+
# https://nodejs.org/

# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Login to Azure
az login
```

### 2. 🤖 Create Bot Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Create new **Bot Channel Registration**
3. Note down:
   - **Application ID** (Bot App ID)
   - **Client Secret** (Bot App Password)
4. Your **AAD Object ID** (find in Azure AD > Users > Your Profile)

### 3. 📦 Deploy Infrastructure & Code

**Option A: PowerShell (Windows)**
```powershell
./deploy.ps1 -ResourceGroupName "your-rg" -BotAppId "your-bot-id" -BotAppPassword "your-secret" -BaristaAadId "your-aad-id"
```

**Option B: Manual Steps**
```bash
# 1. Install dependencies
npm install

# 2. Deploy infrastructure
az deployment group create \
  --resource-group YOUR_RG \
  --template-file deploy.bicep \
  --parameters \
    botAppId="YOUR_BOT_ID" \
    botAppPassword="YOUR_SECRET" \
    baristaAadId="YOUR_AAD_ID"

# 3. Build and deploy code
npm run build
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

### 4. 🔗 Configure Bot Endpoint

1. Copy the messaging endpoint from deployment output
2. Go to your Bot Channel Registration in Azure Portal
3. Set **Messaging Endpoint** to: `https://your-function-app.azurewebsites.net/api/messages`
4. Save configuration

### 5. 📱 Install in Teams

1. Update `manifest.json`:
   ```json
   {
     "id": "YOUR_BOT_APP_ID",
     "bots": [
       {
         "botId": "YOUR_BOT_APP_ID"
       }
     ]
   }
   ```

2. Create Teams app package:
   ```bash
   # Create icons (32x32 and 192x192 PNG files)
   # Place them as icon-outline.png and icon-color.png
   
   # Zip the files
   zip coffee-bot-app.zip manifest.json icon-outline.png icon-color.png
   ```

3. Install in Teams:
   - Go to Teams > Apps > Upload a custom app
   - Select your zip file
   - Install to your team

### 6. ☕ Test Your Bot

1. In Teams, type: `@CoffeeBot order`
2. Fill out the coffee card
3. Submit your order
4. Check for barista notification!

## 🎛️ Configuration

### Environment Variables

Update these in Azure Functions Configuration:

| Variable | Value | Description |
|----------|-------|-------------|
| `DAILY_AM_QUOTA` | `15` | Morning orders limit |
| `DAILY_PM_QUOTA` | `15` | Afternoon orders limit |
| `TIMEZONE` | `America/New_York` | Local timezone |
| `BARISTA_AAD_ID` | Your AAD ID | For notifications |

### Quota Schedule

- **AM Slot**: 12:00 AM - 11:59 AM
- **PM Slot**: 12:00 PM - 11:59 PM
- **Reset**: Automatic at midnight and noon

## 🔍 Troubleshooting

### Bot Not Responding
- ✅ Check messaging endpoint is correct
- ✅ Verify bot credentials in Azure Functions config
- ✅ Check Azure Functions logs for errors

### Orders Not Saving
- ✅ Verify storage connection string
- ✅ Check table exists (`CoffeeOrders`)
- ✅ Review storage account permissions

### Notifications Not Working
- ✅ Confirm `BARISTA_AAD_ID` is correct
- ✅ Ensure bot is installed in your personal chat
- ✅ Check timezone configuration

### Card Not Displaying
- ✅ Validate `AdaptiveCard.json` syntax
- ✅ Test card at [Adaptive Cards Designer](https://adaptivecards.io/designer/)

## 📊 Monitoring

### Azure Portal
- **Function App Logs**: Real-time debugging
- **Application Insights**: Performance metrics
- **Storage Account**: Table data and metrics

### Teams
- Check bot responses in channels
- Monitor order confirmations
- Verify barista notifications

## 🎨 Customization

### Coffee Types
Edit `AdaptiveCard.json` > `coffeeType` choices:
```json
{
  "title": "🆕 New Coffee - Description",
  "value": "New Coffee"
}
```

### Quotas
Update environment variables:
- `DAILY_AM_QUOTA`
- `DAILY_PM_QUOTA`

### Timezone
Change `TIMEZONE` environment variable to your local timezone.

### Styling
Modify `AdaptiveCard.json` for different colors, layouts, or fields.

---

🎉 **You're all set!** Enjoy your automated coffee ordering system!
