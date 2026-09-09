import express from 'express';
import cors from 'cors';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteerExtra.use(StealthPlugin());

const app = express();
const PORT = 3001;

app.use(cors());

let browserInstance = null;

async function getBrowser() {
    // Если браузер уже был запущен и жив — переиспользуем
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    // Иначе (первый запуск ИЛИ браузер упал/отключился) — запускаем заново
    console.log('[Kick Proxy] Запуск нового экземпляра браузера...');
    browserInstance = await puppeteerExtra.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    browserInstance.on('disconnected', () => {
        console.warn('[Kick Proxy] Браузер отключился, при следующем запросе будет перезапущен');
        browserInstance = null;
    });

    return browserInstance;
}

app.get('/api/kick/:username', async (req, res) => {
    const { username } = req.params;
    let page;

    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        await page.goto(`https://kick.com/${username}`, {
            waitUntil: 'domcontentloaded',
            timeout: 45000, // увеличенный таймаут — на медленных сетях 30с не хватало
        });

        const data = await page.evaluate(async (uname) => {
            const resp = await fetch(`https://kick.com/api/v2/channels/${uname}`, {
                headers: { Accept: 'application/json' },
            });
            if (!resp.ok) {
                return { __error: resp.status };
            }
            return resp.json();
        }, username);

        if (data.__error) {
            console.error(`[Kick Proxy] Kick ответил ${data.__error} для "${username}" (через Puppeteer)`);
            return res.status(data.__error).json({ error: `Kick API вернул ${data.__error}` });
        }

        return res.json(data);
    } catch (err) {
        console.error(`[Kick Proxy] Ошибка Puppeteer для "${username}":`, err.message);
        // Сбрасываем браузер — если дело было в мёртвом процессе, следующий запрос запустит новый
        browserInstance = null;
        return res.status(502).json({ error: 'Не удалось получить данные от Kick через браузер', detail: err.message });
    } finally {
        if (page) {
            try { await page.close(); } catch (_) { /* страница могла уже закрыться вместе с браузером */ }
        }
    }
});

app.listen(PORT, () => {
    console.log(`[Kick Proxy] Локальный прокси запущен: http://localhost:${PORT}`);
});
