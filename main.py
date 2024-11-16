import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn

# Get environment variables with defaults
PORT = int(os.getenv("PORT", 8000))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(
    title="Guna Cycle Tracker",
    description="Track your menstrual cycle phases using the three Gunas",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GunaInfo:
    def __init__(self, guna: str, color: str, description: str, hormone: str, practice: str):
        self.guna = guna
        self.color = color
        self.description = description
        self.hormone = hormone
        self.practice = practice

def get_guna_info(day: int) -> Optional[GunaInfo]:
    """Get Guna information based on cycle day."""
    if 1 <= day <= 5:
        return GunaInfo(
            guna="סאטווה (Satva)",
            color="#FFFFFF",
            description="ימי הווסת - התכנסות, רוחניות, חלימה, התמסרות והרפייה",
            hormone="FSH",
            practice="מדיטציה ופראנאימה, פחות עבודה של Moola Bhanda"
        )
    elif 6 <= day <= 16:
        return GunaInfo(
            guna="רג׳אס (Rajas)",
            color="#FF6B6B",
            description="ימי טרום הביוץ והביוץ - אנרגטיות, תקשורתיות, חשק מיני, תנועה",
            hormone="אסטרוגן גבוה ולקראת הביוץ LH גבוה",
            practice="תרגול אנרגטי, ברכות לשמש, הפוכות, פיתולים חזקים"
        )
    elif 17 <= day <= 28:
        return GunaInfo(
            guna="טאמאס (Tamas)",
            color="#333333",
            description="ימי טרום הווסת - עייפות, כובד, רגישות בגוף ובנפש, האטה ועיכול",
            hormone="פרוגסטרון",
            practice="מיקוד ושיווי משקל לאיזון הכובד האנרגטי"
        )
    return None

@app.get("/")
async def read_root():
    """Health check endpoint."""
    return {"status": "healthy", "environment": ENVIRONMENT}

@app.get("/api/guna/{day}")
async def get_guna(day: int):
    """Get Guna information for a specific cycle day."""
    if not 1 <= day <= 28:
        raise HTTPException(status_code=400, detail="יום המחזור חייב להיות בין 1 ל-28")
    
    guna_info = get_guna_info(day)
    if not guna_info:
        raise HTTPException(status_code=404, detail="לא נמצא מידע עבור יום זה")
    
    return {
        "guna": guna_info.guna,
        "color": guna_info.color,
        "description": guna_info.description,
        "hormone": guna_info.hormone,
        "practice": guna_info.practice
    }

# Serve static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
