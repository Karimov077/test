import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const botToken = process.env.BOT_TOKEN;
const secret = process.env.APP_SECRET;
const webhookUrl = process.argv[2];

if (!botToken || !secret || !webhookUrl) {
  throw new Error('Set BOT_TOKEN and APP_SECRET in .env, then pass the deployed URL as an argument.');
}

const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(`${webhookUrl}/api/telegram/webhook`)}&secret_token=${encodeURIComponent(secret)}`;

const response = await fetch(url);
const result = await response.json();

console.log(JSON.stringify(result, null, 2));
