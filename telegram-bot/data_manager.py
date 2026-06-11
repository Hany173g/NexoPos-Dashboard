import json
import threading
from config import DATA_FILE

_lock = threading.Lock()


def load_data():
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_data(data):
    with _lock:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)


def get_license_for_chat(chat_id):
    data = load_data()
    for lic, cid in data.items():
        if cid == chat_id:
            return lic
    return None


def has_chat(chat_id):
    data = load_data()
    return chat_id in data.values()


def get_chat_for_license(license_key):
    data = load_data()
    return data.get(license_key)


def register_chat(chat_id, license_key):
    data = load_data()
    data[license_key] = chat_id
    save_data(data)
