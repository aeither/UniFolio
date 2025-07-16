import type { Env } from '../env';

/**
 * Send a message to Telegram
 */
export async function sendTelegramMessage(
  text: string,
  env: Env,
  chatId?: string,
  parseMode: 'Markdown' | 'MarkdownV2' | 'HTML' | undefined = 'Markdown'
): Promise<boolean> {
  const apiUrl = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
  const targetChatId = chatId || env.TG_CHAT_ID;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: targetChatId, 
        text: text, 
        parse_mode: parseMode 
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error(`Failed to send Telegram message: ${data.description || 'Unknown error'}`);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Network error sending Telegram message:', error);
    return false;
  }
} 