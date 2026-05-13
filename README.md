# Polymarket User Tracker Bot

Ushbu bot Polymarket-dagi muayyan foydalanuvchining (`@bossoskil1`) pozitsiyalari va faolligini kuzatib boradi.

## Xususiyatlari
- **Pozitsiyalar:** Foydalanuvchining joriy ochiq bitimlarini ko'rish.
- **Faollik:** Oxirgi savdo tarixini ko'rish.
- **Avtomatik bildirishnoma:** Yangi bitim ochilganda yoki yopilganda bot darhol sizga xabar beradi.

## O'rnatish va Ishga tushirish

1. **Loyihaga kiring:**
   ```bash
   cd polymarket_bot
   ```

2. **Kutubxonalarni o'rnating:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Sozlamalar:**
   - `.env.example` faylini `.env` deb nomlang.
   - [BotFather](https://t.me/botfather) orqali bot oching va tokenni `.env` ichiga yozing.

4. **Botni ishga tushiring:**
   ```bash
   python -m polymarket_bot.bot
   ```

## Ishlatish
Botga kiring va `/start` tugmasini bosing. Shundan so'ng bot sizni kuzatuvchilar ro'yxatiga qo'shadi. Har safar `@bossoskil1` yangi savdo qilganida bot sizga xabar yuboradi.
