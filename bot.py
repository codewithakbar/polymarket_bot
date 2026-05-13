import asyncio
import json
import logging
import os
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardButton, InlineKeyboardMarkup, CallbackQuery
from aiogram.utils.keyboard import ReplyKeyboardBuilder

from .config import TELEGRAM_BOT_TOKEN, POLL_INTERVAL, TARGET_WALLET
from .polymarket_api import get_user_positions, get_user_activity, get_leaderboard, format_position, format_activity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize bot and dispatcher
bot = Bot(token=TELEGRAM_BOT_TOKEN)
dp = Dispatcher()

# Simple state for persistence
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(BASE_DIR, "bot_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading state: {e}")
    return {"seen_activities": [], "subscribers": []}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

state = load_state()

@dp.message(Command("start"))
async def cmd_start(message: Message):
    chat_id = message.chat.id
    if chat_id not in state["subscribers"]:
        state["subscribers"].append(chat_id)
        save_state(state)
    
    builder = ReplyKeyboardBuilder()
    builder.button(text="📊 Pozitsiyalar")
    builder.button(text="📝 Faollik")
    builder.button(text="🏆 Liderlar")
    builder.adjust(2, 1)
    
    await message.answer(
        f"Salom! Men Polymarket botiman.\n"
        f"Men @bossoskil1 va boshqa top treyderlarni kuzatishga yordam beraman.\n"
        f"Quyidagi tugmalardan birini tanlang:",
        reply_markup=builder.as_markup(resize_keyboard=True)
    )

@dp.message(F.text == "📊 Pozitsiyalar")
async def show_positions(message: Message):
    await show_user_positions(message, TARGET_WALLET)

@dp.message(F.text == "📝 Faollik")
async def show_activity(message: Message):
    await show_user_activity(message, TARGET_WALLET)

@dp.message(F.text == "🏆 Liderlar")
async def show_leaderboard(message: Message):
    await message.answer("Liderlar ro'yxati yuklanmoqda...")
    leaders = await get_leaderboard(limit=10)
    if not leaders:
        await message.answer("Liderlar ro'yxatini yuklashda xatolik yuz berdi.")
        return
    
    text = "🏆 <b>Top 10 Treyderlar (Haftalik PNL bo'yicha):</b>\n\n"
    keyboard = []
    
    for leader in leaders:
        rank = leader.get("rank")
        name = leader.get("userName") or leader.get("proxyWallet")[:10]
        pnl = leader.get("pnl", 0)
        wallet = leader.get("proxyWallet")
        
        text += f"{rank}. <b>{name}</b> - ${float(pnl):,.2f}\n"
        # Create buttons for each leader
        keyboard.append([InlineKeyboardButton(text=f"👀 {name} ni ko'rish", callback_data=f"user:{wallet}")])
    
    markup = InlineKeyboardMarkup(inline_keyboard=keyboard)
    await message.answer(text, reply_markup=markup, parse_mode="HTML")

@dp.callback_query(F.data.startswith("user:"))
async def process_user_selection(callback: CallbackQuery):
    wallet = callback.data.split(":")[1]
    
    keyboard = [
        [
            InlineKeyboardButton(text="📊 Pozitsiyalar", callback_data=f"pos:{wallet}"),
            InlineKeyboardButton(text="📝 Faollik", callback_data=f"act:{wallet}")
        ]
    ]
    markup = InlineKeyboardMarkup(inline_keyboard=keyboard)
    
    await callback.message.edit_text(
        f"Tanlangan hamyon: `{wallet}`\nNimalarni ko'rmoqchisiz?",
        reply_markup=markup,
        parse_mode="HTML"
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("pos:"))
async def process_pos_callback(callback: CallbackQuery):
    wallet = callback.data.split(":")[1]
    await callback.answer("Pozitsiyalar yuklanmoqda...")
    await show_user_positions(callback.message, wallet)

@dp.callback_query(F.data.startswith("act:"))
async def process_act_callback(callback: CallbackQuery):
    wallet = callback.data.split(":")[1]
    await callback.answer("Faollik yuklanmoqda...")
    await show_user_activity(callback.message, wallet)

async def show_user_positions(message: Message, wallet: str):
    positions = await get_user_positions(wallet)
    if not positions:
        await message.answer(f"`{wallet}` uchun hozircha ochiq pozitsiyalar yo'q.", parse_mode="HTML")
        return
    
    text = f"🚀 <b>Joriy pozitsiyalar ({wallet[:10]}...):</b>\n\n"
    for pos in positions[:10]:
        text += format_position(pos) + "\n---\n"
    
    await message.answer(text, parse_mode="HTML")

async def show_user_activity(message: Message, wallet: str):
    activity = await get_user_activity(wallet)
    if not activity:
        await message.answer(f"`{wallet}` uchun hozircha faollik topilmadi.", parse_mode="HTML")
        return
    
    text = f"🕒 <b>Oxirgi faollik ({wallet[:10]}...):</b>\n\n"
    for act in activity[:5]:
        text += format_activity(act) + "\n---\n"
    
    await message.answer(text, parse_mode="HTML")

async def polling_task():
    """
    Background task to poll for new activities.
    """
    logger.info("Polling task started...")
    while True:
        try:
            activities = await get_user_activity()
            if activities:
                # Assuming the API returns most recent first
                # We identify unique activity by timestamp + title + type
                new_found = False
                for act in reversed(activities): # Check oldest first to notify in order
                    # Create a unique key
                    act_id = f"{act.get('timestamp')}_{act.get('title')}_{act.get('type')}"
                    
                    if act_id not in state["seen_activities"]:
                        state["seen_activities"].append(act_id)
                        new_found = True
                        
                        # Notify all subscribers
                        msg = "🔔 <b>Yangi bitim aniqlandi!</b>\n\n" + format_activity(act)
                        for chat_id in state["subscribers"]:
                            try:
                                await bot.send_message(chat_id, msg, parse_mode="HTML")
                            except Exception as e:
                                logger.error(f"Failed to notify {chat_id}: {e}")
                
                if new_found:
                    # Keep history manageable
                    state["seen_activities"] = state["seen_activities"][-100:]
                    save_state(state)
                    
        except Exception as e:
            logger.error(f"Error in polling task: {e}")
            
        await asyncio.sleep(POLL_INTERVAL)

async def main():
    # Start the polling task in the background
    asyncio.create_task(polling_task())
    # Start the bot
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped.")
