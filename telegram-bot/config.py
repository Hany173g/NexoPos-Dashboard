import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
DASHBOARD_API_URL = os.environ.get("DASHBOARD_API_URL", "http://localhost:3000")
ALERTS_SERVER_PORT = int(os.environ.get("ALERTS_SERVER_PORT", "5000"))
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

SUPPORT_FACEBOOK = "https://www.facebook.com/omar.ballouz.2025"
SUPPORT_WHATSAPP = "01013133376"
