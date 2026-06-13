import logging
import time
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from config import BOT_TOKEN, SUPPORT_FACEBOOK, SUPPORT_WHATSAPP
from data_manager import register_chat, get_license_for_chat, has_chat
from license_validator import validate_license_with_dashboard, register_chat_on_dashboard
from welcome import get_welcome_keyboard, get_activation_message, get_welcome_message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WAITING_LICENSE = {}
START_COOLDOWN = {}

def check_start_rate_limit(chat_id):
    now = time.time()
    last = START_COOLDOWN.get(chat_id, 0)
    if now - last < 3:
        return False
    START_COOLDOWN[chat_id] = now
    return True

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id

    if not check_start_rate_limit(chat_id):
        await update.message.reply_text("⏳ الرجاء الانتظار قبل إرسال أمر جديد.")
        return

    existing = get_license_for_chat(chat_id)

    if existing:
        keyboard = get_welcome_keyboard()
        await update.message.reply_text(
            get_welcome_message(),
            reply_markup=keyboard,
            parse_mode="HTML"
        )
    else:
        WAITING_LICENSE[chat_id] = True
        await update.message.reply_text(
            "👋 مرحباً بك في بوت NexoPOS!\n\n"
            "📋 الرجاء إدخال مفتاح الترخيص الخاص بك للبدء:"
        )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text.strip()

    if WAITING_LICENSE.get(chat_id):
        if len(text) > 100:
            await update.message.reply_text("❌ مفتاح الترخيص غير صالح (طويل جداً).\nالرجاء إدخال مفتاح صحيح:")
            return

        logger.info(f"Validating license: {text} for chat {chat_id}")
        result = validate_license_with_dashboard(text, chat_id=chat_id)

        if result.get("valid"):
            register_chat(chat_id, text)
            register_chat_on_dashboard(chat_id, text)
            WAITING_LICENSE.pop(chat_id, None)
            keyboard = get_welcome_keyboard()
            await update.message.reply_text(
                get_activation_message(),
                reply_markup=keyboard,
                parse_mode="HTML"
            )
        else:
            status = result.get("status", "")
            error_msg = result.get("error", "")

            if status == "suspended":
                msg = "❌ الترخيص متوقف تواصل مع الدعم الفني.\n\nالرجاء إدخال مفتاح ترخيص صحيح:"
            elif status == "expired":
                msg = "❌ الترخيص منتهي الصلاحية.\n⚠️ يرجى تجديد الاشتراك للاستمرار في استخدام البوت.\n\nالرجاء إدخال مفتاح ترخيص صحيح:"
            elif status == "not_found":
                msg = "❌ مفتاح الترخيص غير موجود.\n⚠️ تأكد من كتابة المفتاح بشكل صحيح.\n\nالرجاء إدخال مفتاح ترخيص صحيح:"
            else:
                msg = "❌ " + (error_msg if error_msg else "مفتاح الترخيص غير صحيح.") + "\n\nالرجاء إدخال مفتاح ترخيص صحيح:"

            await update.message.reply_text(msg)
    else:
        keyboard = get_welcome_keyboard()
        await update.message.reply_text(
            get_welcome_message(),
            reply_markup=keyboard,
            parse_mode="HTML"
        )

def run_bot():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    logger.info("Bot started polling...")
    app.run_polling()
