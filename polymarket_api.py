import httpx
import logging
from typing import List, Dict, Any
from datetime import datetime
from .config import POLYMARKET_API_BASE, TARGET_WALLET

logger = logging.getLogger(__name__)

async def get_user_positions(wallet: str = TARGET_WALLET) -> List[Dict[str, Any]]:
    """
    Fetch current positions for the user.
    """
    url = f"{POLYMARKET_API_BASE}/positions"
    params = {"user": wallet}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []

async def get_user_activity(wallet: str = TARGET_WALLET) -> List[Dict[str, Any]]:
    """
    Fetch recent activity for the user.
    """
    url = f"{POLYMARKET_API_BASE}/activity"
    params = {"user": wallet, "limit": 20}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching activity: {e}")
            return []

async def get_leaderboard(limit: int = 10, period: str = "week") -> List[Dict[str, Any]]:
    """
    Fetch the leaderboard.
    """
    url = f"{POLYMARKET_API_BASE}/v1/leaderboard"
    params = {
        "timePeriod": period,
        "orderBy": "PNL",
        "limit": limit,
        "offset": 0,
        "category": "overall"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error fetching leaderboard: {e}")
            return []

import html

def format_position(pos: Dict[str, Any]) -> str:
    """
    Format a single position for display.
    """
    title = html.escape(pos.get("title", "Unknown Market"))
    size = pos.get("size", "0")
    avg_price = pos.get("avgPrice", "0")
    outcome = html.escape(pos.get("outcome", "Unknown"))
    pnl = pos.get("pnl", "0")
    
    return (
        f"🎯 <b>Bozor:</b> {title}\n"
        f"✅ <b>Natija:</b> {outcome}\n"
        f"📊 <b>Hajm:</b> {size}\n"
        f"💰 <b>O'rtacha narx:</b> ${float(avg_price):.4f}\n"
        f"📈 <b>P&L:</b> {pnl}\n"
    )

def format_activity(act: Dict[str, Any]) -> str:
    """
    Format a single activity item for display.
    """
    type_raw = act.get("type", "Unknown")
    type_ = type_raw.lower()
    
    timestamp_raw = act.get("timestamp", 0)
    try:
        dt = datetime.fromtimestamp(int(timestamp_raw))
        timestamp = dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        timestamp = str(timestamp_raw)
    
    if type_ == "trade":
        market = html.escape(act.get("title") or act.get("name") or "Bozor")
        side = act.get("side", "").upper() # BUY/SELL
        size = act.get("size", "0")
        price = act.get("price", "0")
        outcome = html.escape(act.get("outcome", ""))
        usdc_size = act.get("usdcSize", "0")
        
        if side == "BUY":
            emoji = "🟢"
            action_text = "SOTIB OLINDI"
        else:
            emoji = "🔴"
            action_text = "SOTILDI"
            
        return (
            f"{emoji} <b>{action_text}</b>\n"
            f"📍 <b>Bozor:</b> {market}\n"
            f"✅ <b>Natija:</b> {outcome}\n"
            f"📊 <b>Hajm:</b> {size} dona (${usdc_size})\n"
            f"💵 <b>Narx:</b> ${float(price):.4f}\n"
            f"🕒 <b>Vaqt:</b> {timestamp}\n"
        )
    
    if type_ == "redemption":
        market = html.escape(act.get("title") or "Bozor")
        amount = act.get("amount", "0")
        return (
            f"💰 <b>FOYDA YECHIB OLINDI (Redemption)</b>\n"
            f"📍 <b>Bozor:</b> {market}\n"
            f"💵 <b>Miqdor:</b> ${amount}\n"
            f"🕒 <b>Vaqt:</b> {timestamp}\n"
        )
    
    return f"📝 <b>Faollik:</b> {html.escape(type_raw)} - {timestamp}"
