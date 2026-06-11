import logging
import requests
from config import DASHBOARD_API_URL

logger = logging.getLogger(__name__)


def validate_license_with_dashboard(license_key, chat_id=None):
    try:
        payload = {"license_key": license_key}
        if chat_id is not None:
            payload["chat_id"] = chat_id

        resp = requests.post(
            f"{DASHBOARD_API_URL}/api/v1/telegram/validate-license",
            json=payload,
            timeout=10
        )
        if resp.status_code == 200:
            return resp.json()
        logger.warning(f"Dashboard returned {resp.status_code}: {resp.text}")
        return {"valid": False, "error": "Server error"}
    except requests.RequestException as e:
        logger.error(f"Failed to contact dashboard: {e}")
        return {"valid": False, "error": "Connection failed"}


def register_chat_on_dashboard(chat_id, license_key):
    try:
        resp = requests.post(
            f"{DASHBOARD_API_URL}/api/v1/telegram/register-chat",
            json={"chat_id": chat_id, "license_key": license_key},
            timeout=10
        )
        if resp.status_code == 200:
            logger.info(f"Chat {chat_id} registered for license {license_key}")
            return True
        logger.warning(f"Register failed: {resp.status_code} {resp.text}")
        return False
    except requests.RequestException as e:
        logger.error(f"Failed to register chat: {e}")
        return False
