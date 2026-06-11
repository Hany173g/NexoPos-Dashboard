import logging
import requests
from flask import Flask, request, jsonify
from config import BOT_TOKEN, ALERTS_SERVER_PORT
from data_manager import get_chat_for_license

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/send-alert", methods=["POST"])
def send_alert():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    license_key = data.get("license_key")
    message = data.get("message")

    if not license_key or not message:
        return jsonify({"error": "license_key and message required"}), 400

    chat_id = get_chat_for_license(license_key)
    if not chat_id:
        logger.warning(f"No chat registered for license: {license_key}")
        return jsonify({"error": "No chat registered for this license"}), 404

    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML"
            },
            timeout=10
        )
        if resp.status_code == 200:
            logger.info(f"Alert sent to chat {chat_id}")
            return jsonify({"success": True})
        else:
            logger.error(f"Telegram API error: {resp.text}")
            return jsonify({"error": "Failed to send message"}), 500
    except requests.RequestException as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return jsonify({"error": str(e)}), 500


def run_server():
    logger.info(f"Alert server starting on port {ALERTS_SERVER_PORT}...")
    app.run(host="0.0.0.0", port=ALERTS_SERVER_PORT, debug=False)
