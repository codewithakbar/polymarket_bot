import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
# Replace with your actual chat ID if you want to receive notifications automatically
# Or the bot can find it when you /start
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID", "")

# User wallet address for @bossoskil1
TARGET_WALLET = "0xa5ea13a81d2b7e8e424b182bdc1db08e756bd96a"
MY_WALLET = "0x85f8098Cacb96D8e691f32A5c77D81dC547EEbe8"
POLYMARKET_API_BASE = "https://data-api.polymarket.com"

# Polling interval in seconds
POLL_INTERVAL = 60

# Web App URL (replace with your server IP or domain)
WEBAPP_URL = os.getenv("WEBAPP_URL", "http://YOUR_SERVER_IP:8000")
