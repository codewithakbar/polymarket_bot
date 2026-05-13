from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from .polymarket_api import get_user_positions, get_user_activity, get_leaderboard
from .config import TARGET_WALLET

app = FastAPI()

# Enable CORS for the Web App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoints
@app.get("/api/positions")
async def api_positions(wallet: str = TARGET_WALLET):
    return await get_user_positions(wallet)

@app.get("/api/activity")
async def api_activity(wallet: str = TARGET_WALLET):
    return await get_user_activity(wallet)

@app.get("/api/leaderboard")
async def api_leaderboard():
    return await get_leaderboard(limit=20)

# Serve Static Files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))

def run_server():
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    run_server()
