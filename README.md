# ☕ Coffee Bot - Teams Coffee Ordering System

A beautiful and functional Microsoft Teams bot that enables team members to order coffee with daily quota management and automatic barista notifications.

## 🌟 Features

- **Fancy Adaptive Cards UI** - Modern, emoji-rich interface for coffee ordering
- **Daily Quota Management** - Separate AM/PM quotas that reset automatically
- **Multiple Coffee Types** - Latte, Cappuccino, Americano, Flat White, Espresso, Cold Brew
- **Customization Options** - Size, milk type, sweetness, and special instructions
- **Real-time Notifications** - Instant notifications to barista when orders are placed
- **Timezone Support** - Proper timezone handling for quota calculations
- **Error Handling** - Comprehensive error handling and user feedback

## 🏗️ Architecture

- **Runtime**: Azure Functions (Node.js TypeScript)
- **Storage**: Azure Table Storage for orders and quotas
- **Bot Framework**: Microsoft Bot Framework SDK v4
- **Frontend**: Adaptive Cards v1.6
- **Deployment**: Azure Bicep templates

## 🚀 Quick Setup

### Prerequisites

- Azure CLI installed and logged in
- Node.js 18+ and npm
- Azure Functions Core Tools v4
- Visual Studio Code (recommended)

### 1. Create Bot Registration

```bash
# Create a new Bot Channel Registration in Azure Portal (or an Azure Bot resource)
# Note down the App ID and create a new client secret
```

### 2. Deploy Azure Resources

```bash
# Deploy infrastructure
az deployment group create \
  --resource-group YOUR_RESOURCE_GROUP \
  --template-file deploy.bicep \
  --parameters \
    botAppId="YOUR_BOT_APP_ID" \
    botAppPassword="YOUR_BOT_APP_PASSWORD" \
    baristaAadId="YOUR_AAD_OBJECT_ID"
```

### 3. Local Development

```bash
# Install dependencies
npm install

# Configure local settings
# Copy the example and fill in your values
cp local.settings.json.example local.settings.json
# On Windows PowerShell:
# Copy-Item -Path .\\local.settings.json.example -Destination .\\local.settings.json
# Edit local.settings.json with your values

# Build and run locally
npm run build
npm start
```

### 4. Deploy Function App

```bash
# Build for production
npm run build

# Deploy to Azure
func azure functionapp publish YOUR_FUNCTION_APP_NAME --typescript
```

### 5. Configure Bot Messaging Endpoint

1. Go to your Bot Channel Registration in Azure Portal
2. Set Messaging Endpoint to: `https://YOUR_FUNCTION_APP.azurewebsites.net/api/messages`
3. Save the configuration

### 6. Install in Teams

1. Update `manifest.json` `id` and `bots[0].botId` with your Bot App ID
2. Create a Teams app package (zip `manifest.json` + `icon-color.png` + `icon-outline.png`)
3. Upload to Teams and install in your team

## 📋 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MicrosoftAppId` | Bot App ID from Azure | `12345678-1234-1234-1234-123456789012` |
| `MicrosoftAppPassword` | Bot App Password | `your-bot-password` |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage account connection | `DefaultEndpointsProtocol=https;...` |
| `BARISTA_AAD_ID` | Your AAD Object ID | `87654321-4321-4321-4321-210987654321` |
| `DAILY_AM_QUOTA` | Morning quota (12AM-11:59AM) | `15` |
| `DAILY_PM_QUOTA` | Afternoon quota (12PM-11:59PM) | `15` |
| `TIMEZONE` | Timezone for quota calculation | `America/New_York` |

Create `local.settings.json` from the example below for local runs:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WEBSITE_NODE_DEFAULT_VERSION": "~18",
    "MicrosoftAppId": "YOUR_BOT_APP_ID",
    "MicrosoftAppPassword": "YOUR_BOT_APP_PASSWORD",
    "MicrosoftAppType": "MultiTenant",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "BARISTA_AAD_ID": "YOUR_AAD_OBJECT_ID",
    "DAILY_AM_QUOTA": "15",
    "DAILY_PM_QUOTA": "15",
    "TIMEZONE": "America/New_York"
  }
}
```

### Quota System

- **AM Slot**: 12:00 AM - 11:59 AM
- **PM Slot**: 12:00 PM - 11:59 PM
- Quotas reset automatically at midnight and noon
- Users can see remaining slots in real-time

## 🎨 UI Features

The Adaptive Card includes:

- **Modern Design**: Clean layout with coffee-themed background
- **Rich Coffee Selection**: 6 coffee types with descriptions and emojis
- **Size Options**: Small (8oz), Medium (12oz), Large (16oz)
- **Milk Choices**: Whole, Skim, Oat, Almond, Coconut, or None
- **Sweetness Levels**: 0-3 sugars with visual indicators
- **Special Instructions**: Free-text field for custom requests
- **Pickup Windows**: Visual AM/PM selection with time indicators

## 🤖 Bot Commands

- `order` or `coffee` - Display the coffee ordering card
- `help` - Show available commands and quota information
- Any other message - Friendly greeting with instructions

## 📊 Data Model

Orders are stored in Azure Table Storage:

```typescript
{
  partitionKey: "yyyymmdd",     // Date: 20241201
  rowKey: "unique-id",          // Random ID
  userAadId: "user-id",         // Azure AD Object ID
  displayName: "John Doe",      // User display name
  coffeeType: "Latte",          // Coffee selection
  size: "Medium",               // Cup size
  milk: "Oat",                  // Milk preference
  sugar: "1",                   // Sugar level
  notes: "Extra hot",           // Special instructions
  slot: "AM",                   // Time slot (AM/PM)
  orderedAtUtc: "2024-12-01...", // Timestamp
  teamId: "team-id",            // Teams team ID
  channelId: "channel-id"       // Teams channel ID
}
```

## 🔔 Notification System

When an order is placed:

1. Order is validated and saved to storage
2. Rich notification is sent to the barista including:
   - Customer name and order details
   - Queue position and remaining slots
   - Order timestamp and special instructions
3. Confirmation message sent to customer with pickup details

## 🛠️ Development

### Project Structure

```
CoffeeBot/
├── CoffeeFunc.ts          # Main bot logic and Azure Function
├── AdaptiveCard.json      # UI definition
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── host.json              # Azure Functions config
├── local.settings.json    # Local development settings (gitignored)
├── deploy.bicep           # Infrastructure as Code
├── manifest.json          # Teams app manifest
└── README.md              # This file
```

### Testing Locally

1. Start Azure Storage Emulator or use cloud storage
2. Run `npm start` to start the Functions runtime
3. Use Bot Framework Emulator to test locally (connect to `http://localhost:7071/api/messages`)
4. Or use ngrok to expose local endpoint for Teams testing
   - `ngrok http 7071`
   - Set the Bot Framework Emulator or Teams messaging endpoint to the provided HTTPS URL plus `/api/messages`

### Debugging

- Check Azure Functions logs in the portal
- Monitor Application Insights for performance
- Use console.log statements (visible in Functions logs)
- Test individual components with Bot Framework Emulator

## 🚨 Troubleshooting

### Common Issues

1. **Bot not responding**: Check messaging endpoint URL and bot credentials
2. **Storage errors**: Verify storage connection string and table permissions
3. **Quota not working**: Check timezone configuration and date formatting
4. **Cards not displaying**: Validate AdaptiveCard.json syntax

### Monitoring

- **Application Insights**: Monitor performance and errors
- **Azure Functions Logs**: Real-time debugging information
- **Storage Metrics**: Track table operations and performance

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

Happy Coffee Ordering! ☕✨
