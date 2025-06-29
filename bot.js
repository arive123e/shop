require('dotenv').config(); // если используешь .env

const TelegramBot = require('node-telegram-bot-api');

// Вставь токен своего бота (или из process.env)
const token = process.env.TELEGRAM_BOT_TOKEN || 'твой_токен_бота';

const bot = new TelegramBot(token, { polling: true });

// Слушаем любые сообщения
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  // Если в сообщении есть ссылка на TaoBao
  if (msg.text && msg.text.includes('taobao.com')) {
    bot.sendMessage(chatId, 'Я получил ссылку! Скоро пришлю информацию о товаре 😊');
    // Здесь позже будет парсер
  } else {
    bot.sendMessage(chatId, 'Привет! Пришли ссылку на товар с TaoBao, и я покажу подробности.');
  }
});
