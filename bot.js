require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const fs = require('fs');

const token = process.env.TELEGRAM_BOT_TOKEN || 'твой_токен_бота';
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Проверяем наличие ссылки на taobao.com
  if (msg.text && msg.text.includes('taobao.com')) {
    bot.sendMessage(chatId, '⏳ Получаю информацию о товаре, подожди пару секунд...');

    try {
      // Запуск браузера
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();

      // Открываем страницу
      await page.goto(msg.text, { waitUntil: 'networkidle2', timeout: 60000 });

      // Получаем HTML и сохраняем в файл
      const html = await page.content();
      fs.writeFileSync('taobao_debug.html', html, 'utf8');
      console.log('HTML сохранён в taobao_debug.html');

      await browser.close();

      bot.sendMessage(chatId, '✅ Страница сохранена! Отправь файл `taobao_debug.html` разработчику (т.е. мне 😊).');
    } catch (error) {
      bot.sendMessage(chatId, '❌ Не удалось получить данные. Ошибка сохранения HTML.');
      console.error('Ошибка Puppeteer:', error.message);
    }
  } else {
    bot.sendMessage(chatId, 'Привет! Пришли ссылку на товар с TaoBao, и я попробую её обработать.');
  }
});
