import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { 
  ActivityHandler, 
  CardFactory, 
  TeamsActivityHandler, 
  TurnContext, 
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration
} from 'botbuilder';
import { TableClient } from '@azure/data-tables';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import fs from 'fs';
import path from 'path';
// Ambient declarations for Node globals to satisfy the linter in environments without full type resolution
declare const process: any;

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Configuration
const AM_QUOTA = parseInt(process.env.DAILY_AM_QUOTA || '15', 10);
const PM_QUOTA = parseInt(process.env.DAILY_PM_QUOTA || '15', 10);
const BARISTA_AAD_ID = process.env.BARISTA_AAD_ID || '';
const TIMEZONE = process.env.TIMEZONE || 'America/New_York';

// Initialize table client
const table = TableClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!, 
  'CoffeeOrders'
);

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.MicrosoftAppId,
  MicrosoftAppPassword: process.env.MicrosoftAppPassword,
  MicrosoftAppType: process.env.MicrosoftAppType,
  MicrosoftAppTenantId: process.env.MicrosoftAppTenantId
});

const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);
const adapter = new CloudAdapter(botFrameworkAuthentication);

class CoffeeBot extends TeamsActivityHandler {
  constructor() {
    super();

    // Handle commands like "@CoffeeBot order"
    this.onMessage(async (context, next) => {
      const text = (context.activity.text || '').toLowerCase().trim();

      if (text.includes('order') || text.includes('coffee')) {
        const cardPath = path.join(process.cwd(), 'AdaptiveCard.json');
        const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
        await context.sendActivity({
          attachments: [CardFactory.adaptiveCard(card)]
        });
      } else if (text.includes('help')) {
        await context.sendActivity(`🤖 **Coffee Bot Commands:**\n\n• Type "**order**" or "**coffee**" to place an order\n• Available daily quotas: AM (${AM_QUOTA}), PM (${PM_QUOTA})\n• Orders reset every half day at midnight and noon`);
      } else {
        await context.sendActivity(`👋 Hi! Type "**order**" to get your coffee card ☕\n\nOr type "**help**" for more options.`);
      }
      await next();
    });
  }

  // Handle Adaptive Card submit actions
  async onInvokeActivity(context: any) {
    const value: any = (context.activity as any).value || {};
    const action = value.action || {};
    const verb: string | undefined = action.verb || value.verb;
    if (verb === 'orderCoffee') {
      return await this.handleOrder(context);
    }
    return { status: 200 };
  }

  private async handleOrder(context: any) {
    try {
      const value: any = (context.activity as any).value || {};
      const payload: any = value?.action?.data ? value.action.data : value; // fields only
      const from = context.activity.from;
      const nowUtc = dayjs.utc();
      const nowLocal = nowUtc.tz(TIMEZONE);

      const yyyy = nowLocal.format('YYYY');
      const mm = nowLocal.format('MM');
      const dd = nowLocal.format('DD');
      const slot = payload.slot; // "AM" | "PM"
      const pk = `${yyyy}${mm}${dd}`;

      // Validate input
      if (!payload.coffeeType || !payload.size || !slot) {
        await context.sendActivity(`❌ Missing required fields. Please fill out the form completely.`);
        return { status: 400 };
      }

      // Count current slot orders
      const entities = table.listEntities({ 
        queryOptions: { 
          filter: `PartitionKey eq '${pk}' and slot eq '${slot}'` 
        }
      });
      let count = 0; 
      for await (const _ of entities) count++;

      const limit = slot === 'AM' ? AM_QUOTA : PM_QUOTA;
      if (count >= limit) {
        const otherSlot = slot === 'AM' ? 'PM' : 'AM';
        const otherEntities = table.listEntities({ 
          queryOptions: { 
            filter: `PartitionKey eq '${pk}' and slot eq '${otherSlot}'` 
          }
        });
        let otherCount = 0; 
        for await (const _ of otherEntities) otherCount++;
        const otherLimit = otherSlot === 'AM' ? AM_QUOTA : PM_QUOTA;
        const otherStatus = otherCount >= otherLimit ? 'also full' : `has ${otherLimit - otherCount} spots left`;
        
        await context.sendActivity(`😔 Sorry, the **${slot}** quota is full (${count}/${limit}). The **${otherSlot}** window ${otherStatus}.`);
        return { status: 200 };
      }

      // Save order
      const entity = {
        partitionKey: pk,
        rowKey: cryptoRandom(),
        userAadId: from.aadObjectId,
        displayName: from.name,
        coffeeType: payload.coffeeType,
        size: payload.size,
        milk: payload.milk || 'None',
        sugar: payload.sugar || '0',
        notes: payload.notes || '',
        slot,
        orderedAtUtc: nowUtc.toISOString(),
        teamId: context.activity.conversation?.tenantId,
        channelId: context.activity.conversation?.id
      };
      
      await table.createEntity(entity);
      console.log(`Order saved: ${JSON.stringify(entity)}`);

      // Notify barista (proactive)
      await this.sendProactiveToBarista(context, entity, count + 1, limit);

      // Ack to user with rich formatting
      const pickupTime = slot === 'AM' ? 'before 12:00 PM' : 'after 12:00 PM';
      const milkText = payload.milk && payload.milk !== 'None' ? ` with ${payload.milk} milk` : '';
      const sugarText = payload.sugar && payload.sugar !== '0' ? `, ${payload.sugar} sugar` : '';
      const notesText = payload.notes ? `\n📝 **Notes:** ${payload.notes}` : '';
      
      await context.sendActivity({
        text: `✅ **Order Confirmed!**\n\n` +
          `☕ **${payload.size} ${payload.coffeeType}**${milkText}${sugarText}\n` +
          `🕒 **Pickup:** ${pickupTime}\n` +
          `📊 **Queue:** #${count + 1} of ${limit} (${slot} slot)${notesText}\n\n` +
          `Thanks! I'll get started on your coffee! ☕✨`,
        textFormat: 'markdown'
      });
      
      return { status: 200 };
    } catch (error: any) {
      console.error('Error handling order:', error);
      await context.sendActivity(`❌ Sorry, there was an error processing your order. Please try again later.`);
      return { status: 500 };
    }
  }

  private async sendProactiveToBarista(context: any, e: any, nth: number, limit: number) {
    try {
      const orderTime = dayjs(e.orderedAtUtc).tz(TIMEZONE).format('h:mm A');
      const milkText = e.milk && e.milk !== 'None' ? ` with ${e.milk} milk` : '';
      const sugarText = e.sugar && e.sugar !== '0' ? `, ${e.sugar} sugar` : '';
      const notesText = e.notes ? `\n📝 **Notes:** ${e.notes}` : '';
      
      const baristaMessage = 
        `🚨 **New Coffee Order!** (#${nth}/${limit} - ${e.slot} slot)\n\n` +
        `👤 **Customer:** ${e.displayName}\n` +
        `☕ **Order:** ${e.size} ${e.coffeeType}${milkText}${sugarText}\n` +
        `🕒 **Ordered at:** ${orderTime}${notesText}\n\n` +
        `💡 **Remaining ${e.slot} slots:** ${limit - nth}`;

      // Send notification to the channel (you can modify this to send to your personal chat)
      await context.sendActivity({
        text: baristaMessage,
        textFormat: 'markdown'
      });
      
      console.log(`Barista notification sent for order: ${e.rowKey}`);
    } catch (error: any) {
      console.error('Error sending barista notification:', error);
    }
  }
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Create bot instance
const bot = new CoffeeBot();

// Initialize table on startup
async function initializeTable() {
  try {
    await table.createTable();
    console.log('Table initialized or already exists');
  } catch (error: any) {
    console.log('Table creation info:', error?.message || String(error));
  }
}

// HTTP trigger function for Azure Functions
  async function messages(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Processing bot request');
  
  try {
    // Ensure table exists
    await initializeTable();
    
    // Process the request using CloudAdapter for Azure Functions
    const authHeader = request.headers.get('authorization') || '';
    const body = await request.text();
    const activity = body ? JSON.parse(body) : {};
    await adapter.processActivity(authHeader, activity, async (turnContext) => {
      await (bot as any).run(turnContext);
    });
    
    return { status: 200 };
      
  } catch (error: any) {
    context.log.error('Error processing request:', error);
    return { 
      status: 500, 
      body: JSON.stringify({ error: 'Internal server error' }) 
    };
  }
}

// Register the function
app.http('messages', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: messages
});
