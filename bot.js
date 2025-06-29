require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN не указан в .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Конвертация цены из юаней в тенге
const yuanToKZT = (yuan) => {
  const rate = 70; // 1 юань = 70 тенге (пример)
  return (parseFloat(yuan.replace(/[^\d.,]/g, '').replace(',', '.')) * rate).toFixed(0);
};

// Парсер 1688 (минимальный, для теста)
async function parse1688(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000); // даём странице догрузиться

    // Получаем данные
    const data = await page.evaluate(() => {
      // Название товара
      const titleEl = document.querySelector('h1.d-title');
      const title = titleEl ? titleEl.innerText.trim() : null;

      // Цена (иногда может быть в span.price)
      let price = null;
      const priceEl = document.querySelector('span.price');
      if (priceEl) {
        price = priceEl.innerText.trim();
      } else {
        // альтернатива — первая цена в offer-price или другой блок
        const offerPriceEl = document.querySelector('.price-original-sku');
        if (offerPriceEl) price = offerPriceEl.innerText.trim();
      }

      // Картинки (собираем все из галереи)
      const images = [];
      const imgEls = document.querySelectorAll('.tab-trigger-content img');
      imgEls.forEach(img => {
        let src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src) {
          if (src.startsWith('//')) src = 'https:' + src;
          else if (!src.startsWith('http')) src = 'https://' + src;
          images.push(src);
        }
      });

      return { title, price, images };
    });

    await browser.close();

    return data;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Обработка сообщений
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text && msg.text.includes('1688.com')) {
    bot.sendMessage(chatId, '🔎 Получаю данные с 1688... Пожалуйста, подождите.');

    try {
      const data = await parse1688(msg.text);

      if (!data.title) {
        bot.sendMessage(chatId, '❌ Не удалось получить данные с 1688. Попробуйте другую ссылку.');
        return;
      }

      const priceKZT = data.price ? yuanToKZT(data.price) : '—';

      let response = `📦 *${data.title}*\n💰 Цена: ${priceKZT} ₸ (примерно)\n\n`;

      if (data.images.length) {
        // Отправляем сначала текст
        await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });

        // Отправляем картинки группой (по 5)
        for (let i = 0; i < data.images.length; i += 5) {
          const media = data.images.slice(i, i + 5).map(url => ({ type: 'photo', media: url }));
          await bot.sendMediaGroup(chatId, media);
        }
      } else {
        // Нет картинок — просто отправляем текст
        bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }

    } catch (error) {
      console.error('Ошибка парсинга 1688:', error);
      bot.sendMessage(chatId, '❌ Ошибка при получении данных. Попробуйте позже.');
    }
  } else {
    bot.sendMessage(chatId, '👋 Привет! Пришли ссылку на товар с 1688.com, и я покажу подробности.');
  }
});
