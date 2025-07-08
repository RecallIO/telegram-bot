import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { RecallioClient, type MemoryRecallRequest } from 'recallio';
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
      const recallRequest: MemoryRecallRequest = {
        userId,
        projectId,
        query,
        scope: 'user',
        limit: 10,
        similarityThreshold: 0.2,
        tags: ['telegram'],
        summarized: true,
        reRank: true,
        type: 'fact'
      };

      const result = await recallClient.recallMemory(recallRequest);
      const response = result
        .map(r => r.content)
        .filter((c): c is string => Boolean(c))
        .join('\n');
      await bot.sendMessage(chatId, response || 'No memory found.');
    } catch (err) {
      await bot.sendMessage(chatId, 'Failed to recall memory.');
    }
    return;
  }

  // ignore other bot commands
  if (text.startsWith('/')) return;

  try {
    const recallRequest: MemoryRecallRequest = {
      userId,
      projectId,
      query: text,
      scope: 'user',
      limit: 10,
      similarityThreshold: 0.2,
      tags: ['telegram'],
      summarized: true,
      reRank: true,
      type: 'fact'
    };

    const recallResult = await recallClient.recallMemory(recallRequest);

    console.log('recallResult:', JSON.stringify(recallResult, null, 2));
    
    const summary = recallResult
      .map(r => r.content)
      .filter((c): c is string => Boolean(c))
      .join('\n');

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
      tags: ['telegram'],
      consentFlag: true
    });
    
  } catch (err) {
    console.error('Failed to process message', err);
    await bot.sendMessage(chatId, 'Failed to process your message.');
  }
});

console.log('Bot started');
