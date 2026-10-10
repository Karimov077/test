import dotenv from 'dotenv';

dotenv.config();

const botToken = process.env.BOT_TOKEN;
const secret = process.env.WEBHOOK_SECRET;
const webhookUrl = process.env.WEBHOOK_URL;

if (!botToken || !secret || !webhookUrl) {
  throw new Error('BOT_TOKEN, WEBHOOK_SECRET and WEBHOOK_URL must be set.');
}

const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(`${webhookUrl}/api/telegram/webhook`)}&secret_token=${encodeURIComponent(secret)}`;

const response = await fetch(url);
const result = await response.json();

console.log(JSON.stringify(result, null, 2));
