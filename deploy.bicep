@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the function app')
param functionAppName string = 'coffee-bot-${uniqueString(resourceGroup().id)}'

@description('Name of the storage account')
param storageAccountName string = 'coffeestorage${uniqueString(resourceGroup().id)}'

@description('Bot App ID')
param botAppId string

@description('Bot App Password')
@secure()
param botAppPassword string

@description('Barista AAD Object ID')
param baristaAadId string

@description('Daily AM Quota')
param dailyAmQuota string = '15'

@description('Daily PM Quota')
param dailyPmQuota string = '15'

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: false
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${functionAppName}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, storageAccount.apiVersion).keys[0].value}'
        }
        {
          name: 'MicrosoftAppId'
          value: botAppId
        }
        {
          name: 'MicrosoftAppPassword'
          value: botAppPassword
        }
        {
          name: 'MicrosoftAppType'
          value: 'MultiTenant'
        }
        {
          name: 'BARISTA_AAD_ID'
          value: baristaAadId
        }
        {
          name: 'DAILY_AM_QUOTA'
          value: dailyAmQuota
        }
        {
          name: 'DAILY_PM_QUOTA'
          value: dailyPmQuota
        }
        {
          name: 'TIMEZONE'
          value: 'America/New_York'
        }
      ]
    }
  }
}

output functionAppName string = functionApp.name
output functionAppHostName string = functionApp.properties.defaultHostName
output storageAccountName string = storageAccount.name
output messagingEndpoint string = 'https://${functionApp.properties.defaultHostName}/api/messages'
