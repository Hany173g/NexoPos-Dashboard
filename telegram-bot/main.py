import threading
from bot import run_bot
from server import run_server

if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    run_bot()
