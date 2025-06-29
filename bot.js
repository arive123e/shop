const puppeteer = require('puppeteer');
const fs = require('fs');

async function parseTaobao(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Сохраняем HTML для отладки
    const html = await page.content();
    fs.writeFileSync('taobao_debug.html', html);

    // Парсим данные
    const data = await page.evaluate(() => {
      // Получаем название товара
      const title = document.querySelector('h3.tb-main-title')?.innerText.trim() || null;

      // Получаем цену
      let price = null;
      const priceElem = document.querySelector('.tb-rmb-num');
      if (priceElem) {
        price = priceElem.innerText.trim();
      }

      // Получаем все картинки товара (миниатюры)
      const imageNodes = document.querySelectorAll('#J_UlThumb li img');
      const images = Array.from(imageNodes).map(img => {
        let src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src) {
          // Формируем полную ссылку, если надо
          if (src.startsWith('//')) src = 'https:' + src;
          else if (src.startsWith('/')) src = 'https://'+ window.location.host + src;
          // Убираем размер, чтобы получить полноразмерное фото
          src = src.replace(/_\d+x\d+\.jpg$/, '.jpg');
        }
        return src;
      }).filter(Boolean);

      // Получаем размеры (если есть)
      const sizeElems = document.querySelectorAll('#J_Prop tb-d-option');
      const sizes = Array.from(sizeElems).map(el => el.innerText.trim());

      return {
        title,
        price,
        images,
        sizes
      };
    });

    return data;

  } catch (error) {
    console.error('Ошибка парсинга Taobao:', error);
    return null;
  } finally {
    await browser.close();
  }
}

// Пример вызова
(async () => {
  const url = 'https://item.taobao.com/item.htm?id=778241066598';
  const result = await parseTaobao(url);
  console.log(result);
})();
