from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from config import SUPPORT_FACEBOOK, SUPPORT_WHATSAPP


def get_welcome_keyboard():
    keyboard = [
        [
            InlineKeyboardButton("📘 Facebook", url=SUPPORT_FACEBOOK),
            InlineKeyboardButton("📱 WhatsApp", url=f"https://wa.me/{SUPPORT_WHATSAPP}"),
        ],
        [
            InlineKeyboardButton("🔗 بوت NexoPOS", url="https://t.me/NexoPos_bot"),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def get_activation_message():
    msg = (
        "✅ <b>تم تفعيل البوت بنجاح!</b>\n\n"
        "🎉 مرحباً بك في نظام تنبيهات NexoPOS!\n\n"
        "📌 <b>ماذا يفعل هذا البوت؟</b>\n"
        "سوف يصلك إشعار عندما يكون مخزون أحد المنتجات أقل من الحد الأدنى.\n\n"
        "⚠️ إذا واجهت أي مشكلة، يرجى التواصل مع الدعم الفني:"
    )
    return msg


def get_welcome_message():
    msg = (
        "👋 <b>مرحباً بك في بوت تنبيهات NexoPOS!</b>\n\n"
        "✅ تم تفعيل البوت بنجاح.\n"
        "سوف يصلك إشعار عند انخفاض المخزون.\n\n"
        "⚠️ إذا واجهت أي مشكلة، يرجى التواصل مع الدعم الفني:"
    )
    return msg
