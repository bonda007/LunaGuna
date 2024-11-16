# Guna Cycle Tracker

מעקב אחר המחזור החודשי בהתאם לשלושת הגונות.

## התקנה

1. התקנת הדרישות:
```bash
pip install -r requirements.txt
```

2. הרצת השרת:
```bash
uvicorn main:app --reload
```

## משתני סביבה
- `PORT` - פורט להרצת השרת (ברירת מחדל: 8000)
- `ENVIRONMENT` - סביבת הריצה (development/production)
- `ALLOWED_ORIGINS` - דומיינים מורשים (מופרדים בפסיקים)

## טכנולוגיות
- Python
- FastAPI
- HTML/CSS/JavaScript