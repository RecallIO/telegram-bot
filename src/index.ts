import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { RecallioClient } from 'recallio';

dotenv.config();

const token = process.env.TELEGRAM_TOKEN;
const recallApiKey = process.env.RECALLIO_API_KEY;
const projectId = process.env.RECALLIO_PROJECT_ID;

if (!token || !recallApiKey || !projectId) {
  throw new Error('TELEGRAM_TOKEN, RECALLIO_API_KEY and RECALLIO_PROJECT_ID must be set');
}

const bot = new TelegramBot(token, { polling: true });
const recallClient = new RecallioClient({ apiKey: recallApiKey });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id.toString() || '';
  const text = msg.text || '';

  if (!text) return;

  // Command to recall previous memories
  const recallMatch = text.match(/^\/recall\s+(.+)/i);
  if (recallMatch) {
    const query = recallMatch[1];
    try {
      const result = await recallClient.recallMemory({
        userId,
        projectId,
        query,
        scope: 'user'
      });
      const response = result.content || 'No memory found.';
      await bot.sendMessage(chatId, response);
    } catch (err) {
      await bot.sendMessage(chatId, 'Failed to recall memory.');
    }
    return;
  }

  // ignore bot commands
  if (text.startsWith('/')) return;

  try {
    await recallClient.writeMemory({
      userId,
      projectId,
      content: text,
      consentFlag: true
    });
  } catch (err) {
    console.error('Failed to store memory', err);
  }
});

console.log('Bot started');
