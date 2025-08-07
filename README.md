# CATALYST CLUB Telegram Bot & Mini App

## Структура проекта

- `/backend/` — FastAPI backend (Python)
- `/bot/` — Telegram-бот (python-telegram-bot)
- `/miniapp/` — React Mini App (Telegram WebApp)
- `subscriptions.json`, `payments.json`, `questions.json` — данные (в корне backend)
- `miniappsava.png` — логотип mini app
- `ОФЕРТА.pdf` — договор оферты

## Запуск

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Telegram-бот
```bash
cd bot
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python bot.py
```

### Mini App
```bash
cd miniapp
npm install
npm start
```

---

- Все данные хранятся в JSON-файлах.
- Для продакшн-режима замените URL backend/miniapp в настройках.
- Для интеграции оплаты используйте API-ключ LAVA: `Gr9m3i7o8eZH17cKaleLdQz3INAIqAmcBnp9zPNv501BEFYjSirJfnV9CVaBd9DW`
