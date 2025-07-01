import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { RecallioClient } from 'recallio';
import OpenAI from 'openai';

dotenv.config();

const token = process.env.TELEGRAM_TOKEN;
const recallApiKey = process.env.RECALLIO_API_KEY;
const projectId = process.env.RECALLIO_PROJECT_ID;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!token || !recallApiKey || !projectId || !openaiApiKey) {
  throw new Error('TELEGRAM_TOKEN, RECALLIO_API_KEY, RECALLIO_PROJECT_ID and OPENAI_API_KEY must be set');
}

const bot = new TelegramBot(token, { polling: true });
const recallClient = new RecallioClient({ apiKey: recallApiKey });
const openai = new OpenAI({ apiKey: openaiApiKey });

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

  // ignore other bot commands
  if (text.startsWith('/')) return;

  try {
    const recallResult = await recallClient.recallMemory({
      userId,
      projectId,
      query: text,
      scope: 'user',
      summarized: true
    });
    const summary = (recallResult && recallResult.content) || '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `Relevant history: ${summary}` },
        { role: 'user', content: text }
      ]
    });

    const answer = completion.choices[0]?.message?.content?.trim() || '';
    if (answer) {
      await bot.sendMessage(chatId, answer);
    }

    // store request and answer as memories
    await recallClient.writeMemory({
      userId,
      projectId,
      content: text,
      consentFlag: true
    });
    if (answer) {
      await recallClient.writeMemory({
        userId,
        projectId,
        content: answer,
        consentFlag: true
      });
    }
  } catch (err) {
    console.error('Failed to process message', err);
    await bot.sendMessage(chatId, 'Failed to process your message.');
  }
});

console.log('Bot started');
