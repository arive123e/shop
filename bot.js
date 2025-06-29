const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const puppeteer = require('puppeteer-core');
const input = require('input');

const apiId = YOUR_API_ID; // вставь свои данные
const apiHash = 'YOUR_API_HASH';
const stringSession = new StringSession(''); // вставь сюда сессионную строку или оставь пустой для логина

// Вспомогательная функция для извлечения ссылки из текста
function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

// Парсер 1688
async function parse1688(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    executablePath: '/path/to/chrome', // укажи путь к хрому, если нужно
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Пример парсинга названия товара
  const title = await page.$eval('title', el => el.innerText).catch(() => null);

  // Тут добавь парсинг цены, изображений и размеров, например:
  const price = await page.$eval('.price-class', el => el.innerText).catch(() => null);
  // ... аналогично для images, sizes

  await browser.close();

  return { title, price, images: [], sizes: [] };
}

(async () => {
  console.log('Запускаем Telegram клиента...');
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text('Enter your phone number:'),
    password: async () => await input.text('Enter your password:'),
    phoneCode: async () => await input.text('Enter the code you received:'),
    onError: (err) => console.log(err),
  });
  console.log('Клиент запущен!');

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message.message) return;

    const rawText = message.message;
    const url = extractUrl(rawText);

    if (url && url.includes('1688.com')) {
      await client.sendMessage(message.chatId, 'Получаю данные, подожди...');
      try {
        const data = await parse1688(url);
        await client.sendMessage(message.chatId, `Название: ${data.title || 'нет данных'}\nЦена: ${data.price || 'нет данных'}`);
        // Можешь добавить отправку изображений и размеров здесь
      } catch (e) {
        await client.sendMessage(message.chatId, 'Ошибка при парсинге 1688: ' + e.message);
      }
    } else {
      await client.sendMessage(message.chatId, 'Пожалуйста, отправь корректную ссылку с 1688.com');
    }
  }, new NewMessage({}));

})();
