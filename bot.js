require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const token = process.env.TELEGRAM_BOT_TOKEN || 'твой_токен_бота';
const bot = new TelegramBot(token, { polling: true });

const CNY_TO_KZT = 70;

async function parseTaobao(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // Чтобы Taobao не ругался на бота
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);

    // Название товара (заголовок страницы)
    let title = $('title').first().text() || 'Товар с TaoBao';

    // Цена (пытаемся найти несколько вариантов)
    let price =
      $('[class*=price]').first().text().replace(/[^\d.]/g, '') ||
      data.match(/"price":"([\d.]+)"/)?.[1] ||
      null;

    if (!price) price = 'Не удалось определить цену';

    // Основное фото (берём первую большую картинку)
    let photo = $('img').first().attr('src');
    if (photo && !photo.startsWith('http')) photo = 'https:' + photo;

    // Краткое описание (если есть)
    let desc =
      $('meta[name="description"]').attr('content') ||
      'Описание недоступно';

    return {
      title,
      priceCny: price,
      priceKzt: price && !isNaN(+price) ? Math.round(Number(price) * CNY_TO_KZT) : '-',
      photo,
      desc
    };
  } catch (e) {
    console.error('Ошибка парсинга TaoBao:', e.message);
    return null;
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && msg.text.includes('taobao.com')) {
    bot.sendMessage(chatId, '⏳ Ищу информацию о товаре, подожди пару секунд...');
    const data = await parseTaobao(msg.text);

    if (!data) {
      bot.sendMessage(chatId, '❌ Не удалось получить данные. Возможно, ссылка нерабочая или TaoBao временно недоступен.');
      return;
    }

    let text = `🛒 <b>${data.title}</b>\n\n💰 Цена: ${data.priceCny} ¥ (~${data.priceKzt} ₸)\n\n${data.desc}`;
    if (data.photo) {
      bot.sendPhoto(chatId, data.photo, { caption: text, parse_mode: "HTML" });
    } else {
      bot.sendMessage(chatId, text, { parse_mode: "HTML" });
    }
  } else {
    bot.sendMessage(chatId, 'Привет! Пришли ссылку на товар с TaoBao, и я покажу подробности.');
  }
});
