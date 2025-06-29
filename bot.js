import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import puppeteer from "puppeteer";

const apiId = YOUR_API_ID; // замени на свои
const apiHash = 'YOUR_API_HASH'; // замени на свои
const stringSession = new StringSession('YOUR_STRING_SESSION'); // если нет, создай

function extractUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

async function parse1688(url) {
  console.log('[parse1688] Запуск парсинга URL:', url);
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Пример получения данных — адаптируй под реальный сайт 1688
  const data = await page.evaluate(() => {
    const title = document.querySelector('h1')?.innerText || null;
    const price = document.querySelector('.price')?.innerText || null;
    // добавь по необходимости
    return { title, price };
  });

  await browser.close();

  console.log('[parse1688] Данные с сайта:', data);
  return data;
}

(async () => {
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Введите номер телефона: "),
    password: async () => await input.text("Введите пароль 2FA: "),
    phoneCode: async () => await input.text("Введите код из SMS: "),
    onError: (err) => console.log(err),
  });

  console.log('Бот запущен.');

  client.addEventHandler(async (event) => {
    console.log('Получено новое событие');
    const message = event.message;
    if (!message || !message.message) {
      console.log('Нет текста в сообщении, пропуск...');
      return;
    }
    const rawText = message.message;
    console.log('Текст сообщения:', rawText);
    const url = extractUrl(rawText);
    console.log('Извлечён URL:', url);

    if (url && url.includes('1688.com')) {
      await client.sendMessage(message.chatId, 'Получаю данные, подожди...');
      try {
        const data = await parse1688(url);
        console.log('Данные получены:', data);
        await client.sendMessage(
          message.chatId,
          `Название: ${data.title || 'нет данных'}\nЦена: ${data.price || 'нет данных'}`
        );
      } catch (e) {
        console.log('Ошибка парсинга:', e);
        await client.sendMessage(message.chatId, 'Ошибка при парсинге 1688: ' + e.message);
      }
    } else {
      console.log('URL не валиден или не из 1688');
      await client.sendMessage(message.chatId, 'Пожалуйста, отправь корректную ссылку с 1688.com');
    }
  }, new NewMessage({}));
})();
