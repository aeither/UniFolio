import { loadEnv, validateEnv } from "./utils/envLoader";

interface TelegramCommand {
  command: string;
  description: string;
}

/**
 * Script to register all bot commands with Telegram's Bot API
 * This makes the commands appear in the "/" menu for users
 */
async function setupBotCommands() {
  try {
    console.log('🤖 Setting up Telegram bot commands...');
    console.log('=====================================');

    // Load environment variables
    const env = loadEnv();
    
    // Validate required environment variables
    validateEnv(env as unknown as Record<string, string>, ['BOT_TOKEN']);

    const botToken = env.BOT_TOKEN;
    console.log('✅ Bot token loaded');

    // Define basic starter commands
    const commands: TelegramCommand[] = [
      {
        command: "start",
        description: "Open the mini app"
      },
      {
        command: "run",
        description: "Open any URL in mini app"
      },
      {
        command: "help",
        description: "Show help information"
      },
      {
        command: "ping",
        description: "Test if the bot is responsive"
      }
    ];

    console.log(`📋 Registering ${commands.length} commands...`);

    // Call Telegram Bot API to set commands
    const apiUrl = `https://api.telegram.org/bot${botToken}/setMyCommands`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: commands
      })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      console.log('✅ Commands registered successfully!');
      console.log('\n📝 Registered commands:');
      commands.forEach((cmd, index) => {
        console.log(`${index + 1}. /${cmd.command} - ${cmd.description}`);
      });
      
      console.log('\n💡 Users can now see these commands by typing "/" in the chat');
      console.log('🎉 Bot setup complete!');
      
      return {
        success: true,
        commandsRegistered: commands.length
      };
      
    } else {
      console.error('❌ Failed to register commands:', result);
      return {
        success: false,
        error: result
      };
    }

  } catch (error) {
    console.error('❌ Error setting up bot commands:', error);
    return {
      success: false,
      error: error
    };
  }
}

/**
 * Alternative function to clear/delete all commands
 */
async function clearBotCommands() {
  try {
    console.log('🗑️ Clearing all bot commands...');

    const env = loadEnv();
    validateEnv(env as unknown as Record<string, string>, ['BOT_TOKEN']);

    const botToken = env.BOT_TOKEN;
    const apiUrl = `https://api.telegram.org/bot${botToken}/setMyCommands`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: [] // Empty array clears all commands
      })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      console.log('✅ All commands cleared successfully!');
      return { success: true };
    } else {
      console.error('❌ Failed to clear commands:', result);
      return { success: false, error: result };
    }

  } catch (error) {
    console.error('❌ Error clearing bot commands:', error);
    return { success: false, error: error };
  }
}

/**
 * Function to get current registered commands
 */
async function getCurrentCommands() {
  try {
    console.log('📋 Fetching current bot commands...');

    const env = loadEnv();
    validateEnv(env as unknown as Record<string, string>, ['BOT_TOKEN']);

    const botToken = env.BOT_TOKEN;
    const apiUrl = `https://api.telegram.org/bot${botToken}/getMyCommands`;
    
    const response = await fetch(apiUrl);
    const result = await response.json();

    if (response.ok && result.ok) {
      console.log('✅ Current commands:');
      if (result.result && result.result.length > 0) {
        result.result.forEach((cmd: any, index: number) => {
          console.log(`${index + 1}. /${cmd.command} - ${cmd.description}`);
        });
      } else {
        console.log('No commands registered');
      }
      return { success: true, commands: result.result };
    } else {
      console.error('❌ Failed to get commands:', result);
      return { success: false, error: result };
    }

  } catch (error) {
    console.error('❌ Error getting bot commands:', error);
    return { success: false, error: error };
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      await setupBotCommands();
      break;
    case 'clear':
      await clearBotCommands();
      break;
    case 'list':
      await getCurrentCommands();
      break;
    default:
      console.log('Usage: pnpm run commands:setup [setup|clear|list]');
      console.log('  setup - Register bot commands');
      console.log('  clear - Clear all commands');
      console.log('  list  - Show current commands');
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { setupBotCommands, clearBotCommands, getCurrentCommands }; 