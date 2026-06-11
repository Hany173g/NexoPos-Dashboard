import json
import threading
from config import DATA_FILE
from bot import run_bot
from server import run_server

if __name__ == "__main__":
    bot_thread = threading.Thread(target=run_bot, daemon=True)
    bot_thread.start()
    run_server()
