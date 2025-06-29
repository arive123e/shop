require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

// Вставь токен своего бота (или используй process.env)
const token = process.env.TELEGRAM_BOT_TOKEN || 'твой_токен_бота';

const bot = new TelegramBot(token, { polling: true });

// 1️⃣ Этот обработчик покажет твой Telegram ID в консоли при любом сообщении
bot.on('message', (msg) => {
  console.log('Твой Telegram ID:', msg.from.id);
});

// 2️⃣ Админ-блок — только для твоего ID
const ADMIN_ID = 123456789; // замени на свой id после того, как увидишь его в консоли

bot.onText(/\/add|Добавить товар/i, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, 'Пришли ссылку на товар с TaoBao 🛒');
  bot.once('message', (linkMsg) => {
    if (linkMsg.from.id !== ADMIN_ID) return;
    if (linkMsg.text && linkMsg.text.includes('taobao.com')) {
      // Имитация парсинга — шаблон карточки!
      const template = `
📦 *Товар с TaoBao*
Ссылка: ${linkMsg.text}

Название: [заглушка]
Цена на сайте: [123¥]
Моя цена: [1700₽]
Описание: [описание]
      `;
      bot.sendMessage(linkMsg.chat.id, template, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(linkMsg.chat.id, 'Похоже, это не ссылка на TaoBao. Попробуй ещё раз!');
    }
  });
});

// 3️⃣ Для всех остальных (клиентов)
bot.on('message', (msg) => {
  if (msg.from.id === ADMIN_ID) return; // чтобы не дублировалось для админа
  const chatId = msg.chat.id;
  if (msg.text && msg.text.includes('taobao.com')) {
    bot.sendMessage(chatId, 'Я получил ссылку! Скоро пришлю информацию о товаре 😊');
    // Здесь позже будет парсер для клиентов
  } else {
    bot.sendMessage(chatId, 'Привет! Пришли ссылку на товар с TaoBao, и я покажу подробности.');
  }
});
