from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from telegram.constants import ParseMode
from fastapi import FastAPI, Request
import os
import logging
import uvicorn
import asyncio
import threading

TOKEN = os.getenv('TG_BOT_TOKEN', '8354723250:AAEWcX6OojEi_fN-RAekppNMVTAsQDU0wvo')
CHANNEL_ID = -1002686841761

logging.basicConfig(level=logging.INFO)

LANGUAGES = {'ru': 'Русский', 'en': 'English', 'de': 'Deutsch'}

I18N = {
    'ru': {
        'start': 'Доброго времени суток! Это официальный бот канала CATALYST CLUB, который поможет узнать больше о закрытом канале "ОСНОВА" и вступить в него.\n\n💳 Подписка — 1500₽ в месяц (~14$). Оплата — в рублях, крипте, любой валюте и Telegram Stars.\n\nВыбери вариант ниже:',
        'pay': 'Оплатить доступ',
        'about': 'Подробнее о канале',
        'ask': 'Задать вопрос',
        'offer': 'Договор оферты',
        'question_hint': 'Пожалуйста, воспользуйтесь mini app для отправки вопроса.',
        'about_text': 'Канал "ОСНОВА" — закрытое сообщество для ... (описание)',
        'pay_text': 'Для оплаты используйте mini app (кнопка ниже или в меню)',
        'choose_lang': 'Выберите язык / Choose language / Sprache wählen:',
        'lang_set': 'Язык установлен: {lang}'
    },
    'en': {
        'start': 'Welcome! This is the official bot of CATALYST CLUB. Learn more about the private channel "OSNOVA" and join.',
        'pay': 'Pay for access',
        'about': 'About the channel',
        'ask': 'Ask a question',
        'offer': 'Offer agreement',
        'question_hint': 'Please use the mini app to ask your question.',
        'about_text': 'The "OSNOVA" channel is a private community for ... (description)',
        'pay_text': 'To pay, use the mini app (button below or in menu)',
        'choose_lang': 'Choose language:',
        'lang_set': 'Language set: {lang}'
    },
    'de': {
        'start': 'Willkommen! Dies ist der offizielle Bot des CATALYST CLUB. Erfahre mehr über den privaten Kanal "OSNOVA" und trete bei.',
        'pay': 'Zugang bezahlen',
        'about': 'Über den Kanal',
        'ask': 'Frage stellen',
        'offer': 'Angebotsvertrag',
        'question_hint': 'Bitte nutze die Mini-App, um deine Frage zu stellen.',
        'about_text': 'Der Kanal "OSNOVA" ist eine private Community für ... (Beschreibung)',
        'pay_text': 'Für die Zahlung nutze die Mini-App (unten oder im Menü)',
        'choose_lang': 'Sprache wählen:',
        'lang_set': 'Sprache eingestellt: {lang}'
    }
}

user_lang = {}

# --- FastAPI для интеграции с backend ---
fastapi_app = FastAPI()

@fastapi_app.post("/webhook_question")
async def webhook_question(request: Request):
    data = await request.json()
    username = data.get('username', 'unknown')
    user_id = data.get('user_id', 'unknown')
    message = data.get('message', '')
    file_url = data.get('file_url')
    text = f"❓ Новый вопрос от пользователя:\nUsername: @{username}\nUser ID: {user_id}\nСообщение: {message}"
    if file_url:
        text += f"\n[Вложение]({file_url})"
    await send_to_channel(text)
    return {"status": "ok"}

@fastapi_app.post("/webhook_answer")
async def webhook_answer(request: Request):
    data = await request.json()
    user_id = data.get('user_id')
    answer = data.get('answer')
    text = f"📩 Ответ на ваш вопрос: {answer}\n👉 Открыть чат (снова mini app)"
    await send_to_user(user_id, text)
    return {"status": "ok"}

async def send_to_channel(text):
    app = Application.builder().token(TOKEN).build()
    await app.bot.send_message(chat_id=CHANNEL_ID, text=text, parse_mode=ParseMode.MARKDOWN)

async def send_to_user(user_id, text):
    app = Application.builder().token(TOKEN).build()
    await app.bot.send_message(chat_id=user_id, text=text)

# --- Языковая утилита ---
def get_lang(user):
    if user.id in user_lang:
        return user_lang[user.id]
    tg_lang = (user.language_code or 'ru')[:2]
    return tg_lang if tg_lang in I18N else 'ru'

def t(user, key):
    lang = get_lang(user)
    return I18N[lang][key]

def get_main_menu(user):
    return ReplyKeyboardMarkup([
        [t(user, 'pay')],
        [KeyboardButton(t(user, 'ask'), web_app=WebAppInfo(url="https://acqu1red.github.io/osnovabot/"))],
        [t(user, 'about')],
        [t(user, 'offer')]
    ], resize_keyboard=True)

# --- Telegram Bot Handlers ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    try:
        await update.message.reply_text(
            t(user, 'start'),
            reply_markup=get_main_menu(user)
        )
    except Exception as e:
        print(f"Ошибка в start: {e}")
        await update.message.reply_text("Ошибка при формировании меню. Попробуйте позже.")

async def handle_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text
    if text == t(user, 'pay'):
        # Показываем inline-клавиатуру с опциями оплаты
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("💫 Оплата звездами (1000 звезд)", callback_data="pay_stars")],
            [InlineKeyboardButton("💳 Оплатить другим способом", web_app=WebAppInfo(url="https://acqu1red.github.io/osnovabot/"))]
        ])
        await update.message.reply_text(
            "Выберите способ оплаты:",
            reply_markup=keyboard
        )
    elif text == t(user, 'about'):
        await update.message.reply_text(t(user, 'about_text'))
    elif text == t(user, 'offer'):
        # Отправка PDF оферты
        pdf_path = os.path.join(os.path.dirname(__file__), '../miniapp/public/ОФЕРТА.pdf')
        if os.path.exists(pdf_path):
            await update.message.reply_document(open(pdf_path, 'rb'), filename='ОФЕРТА.pdf')
        else:
            await update.message.reply_text('Оферта не найдена.')
    elif text in LANGUAGES.values():
        # Обработка выбора языка через меню
        for code, name in LANGUAGES.items():
            if text == name:
                user_lang[user.id] = code
                await update.message.reply_text(I18N[code]['lang_set'].format(lang=name))

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "pay_stars":
        # Здесь будет логика оплаты звездами
        await query.edit_message_text("💫 Оплата звездами\n\nДля оплаты 1000 звездами нажмите кнопку ниже:")
        # Добавляем кнопку для оплаты звездами
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("💫 Оплатить 1000 звезд", callback_data="confirm_stars")]
        ])
        await query.edit_message_reply_markup(keyboard)
    elif query.data == "confirm_stars":
        await query.edit_message_text("✅ Оплата звездами подтверждена! Ожидайте подтверждения от администратора.")

async def language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Команда /language для ручного выбора
    user = update.effective_user
    buttons = [[name] for name in LANGUAGES.values()]
    await update.message.reply_text(
        t(user, 'choose_lang'),
        reply_markup=ReplyKeyboardMarkup(buttons, resize_keyboard=True)
    )

def run_fastapi():
    uvicorn.run(fastapi_app, host="0.0.0.0", port=8001)

# --- Запуск ---
def main():
    threading.Thread(target=run_fastapi, daemon=True).start()
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("language", language))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.run_polling()

if __name__ == "__main__":
    main()