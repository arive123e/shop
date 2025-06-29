require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

const token = process.env.TELEGRAM_BOT_TOKEN || 'твой_токен_бота';
const bot = new TelegramBot(token, { polling: true });
const CNY_TO_KZT = 70;

// Функция парсинга таобао
async function parseTaobao(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Название
    const title = await page.title();

    // Цена
    let price = await page.evaluate(() => {
      // Поищем несколько вариантов селекторов
      let priceSel =
        document.querySelector('.price') ||
        document.querySelector('[class*=Price--priceInt]') ||
        document.querySelector('[class*=price] span');
      return priceSel ? priceSel.textContent.replace(/[^\d.]/g, '') : null;
    });

    // Фото (основная картинка товара)
    let photo = await page.evaluate(() => {
      // На новых страницах Taobao — большое фото обычно вот так:
      let imgEl =
        document.querySelector('.tb-main-pic img') ||
        document.querySelector('img[data-src]') ||
        document.querySelector('img');
      let src = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
      if (src && !src.startsWith('http')) src = 'https:' + src;
      return src;
    });

    // Варианты (размеры, цвета и др.)
    let sizes = await page.evaluate(() => {
      let labelEls = Array.from(document.querySelectorAll('.tb-prop:not(.tb-hidden) .tb-prop-content a'));
      if (labelEls.length === 0) {
        labelEls = Array.from(document.querySelectorAll('[class*=sku] [class*=item]'));
      }
      return labelEls.map(el => el.innerText.trim()).filter(Boolean);
    });

    await browser.close();

    return {
      title,
      priceCny: price,
      priceKzt: price && !isNaN(+price) ? Math.round(Number(price) * CNY_TO_KZT) : '-',
      photo,
      sizes
    };
  } catch (e) {
    if (browser) await browser.close();
    console.error('Ошибка Puppeteer:', e.message);
    return null;
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && msg.text.includes('taobao.com')) {
    bot.sendMessage(chatId, '⏳ Получаю информацию о товаре, подожди пару секунд...');
    const data = await parseTaobao(msg.text);
    if (!data) {
      bot.sendMessage(chatId, '❌ Не удалось получить данные. Возможно, ссылка нерабочая или Taobao временно недоступен.');
      return;
    }
    let sizes = data.sizes && data.sizes.length
      ? `\n\n<b>Варианты:</b> ${data.sizes.join(', ')}`
      : '';
    let message = `📦 <b>${data.title}</b>\n\n<b>Цена:</b> ${data.priceCny} ¥ (~${data.priceKzt} ₸)${sizes}`;

    if (data.photo) {
      bot.sendPhoto(chatId, data.photo, { caption: message, parse_mode: 'HTML' });
    } else {
      bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    }
  } else {
    bot.sendMessage(chatId, '👋 Пришли ссылку на товар с TaoBao, и я покажу подробности.');
  }
});
