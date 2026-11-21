# LunaGuna

מעקב גונות לסייקל הנשי. האפליקציה ממפה את המחזור לשלוש גונות — סאטווה, רג׳אס וטאמאס — ומראה את היום ואת הימים שאחר כך.

LunaGuna maps a menstrual cycle onto three gunas (Satva, Rajas, Tamas) and shows today plus the days ahead.

זה אתר סטטי. אין שרת, אין בסיס נתונים, ואין אנליטיקס. כל החישוב רץ בדפדפן, והנתונים נשמרים רק ב־`localStorage` של המכשיר.

This is a static site. There is no server, no database, and no analytics. The calculation runs in the browser, and cycle data stays in `localStorage` on the device.

## פרטיות

נתוני המחזור לא נשלחים לשום מקום. אין עוגיות מעקב. בהגדרות יש מחיקה שמוחקת את הכל מהדפדפן הזה, כולל בחירת השפה. הוספה ליומן Google פותחת את Google עם שם האירוע והתיאור, ורק אם בוחרים בכך.

Cycle data is not sent anywhere. There are no tracking cookies. Settings includes a delete action that clears everything in this browser, including the language choice. Adding an event to Google Calendar opens Google with the event title and description, and only if you choose that.

## לא ייעוץ רפואי

LunaGuna אינה ייעוץ רפואי ואינה אמצעי מניעה. המידע מבוסס על מחזור ממוצע. כל אישה חווה את המחזור אחרת.

LunaGuna is not medical advice and is not contraception. The map is a simple estimate from an average cycle.

## המפה

במחזור של 28 יום ובווסת של 5 ימים, הימים זהים לאפליקציה המקורית:

| גונה | ימים | אופי |
| --- | --- | --- |
| סאטווה (Satva) | 1–5 | ימי הווסת — התכנסות, מנוחה, התבוננות |
| רג׳אס (Rajas) | 6–16 | ימי טרום הביוץ והביוץ — אנרגיה, תנועה, יוזמה |
| טאמאס (Tamas) | 17–28 | ימי טרום הווסת — האטה, סדר, רגישות |

טאמאס נשאר 12 ימים גם כשאורך המחזור משתנה. ביוץ משוער הוא אורך המחזור פחות 14, ורג׳אס נמשך עד יומיים אחריו. ימים עודפים או חסרים ביחס ל־28 נכנסים לרג׳אס. סאטווה הוא אורך הווסת (ברירת מחדל 5, אפשר 3–8). אורך מחזור: 21–35.

באפליקציה הישנה השדה "אורך מחזור" נשמר במסך אבל לא השפיע על החישוב. עכשיו הוא כן.

On a 28-day cycle with a 5-day period, the days match the original app: Satva 1–5, Rajas 6–16, Tamas 17–28. Tamas stays 12 days for other cycle lengths. Estimated ovulation is cycle length minus 14, and Rajas runs through two days after that. Days added or removed relative to 28 sit in Rajas. The old screen asked for cycle length and then ignored it.

## להריץ מקומית

צריך שרת סטטי קטן, כי הדפדפן לא טוען מודולים של JavaScript מקובץ `file://`.

```bash
python3 -m http.server 8000
```

ואז לפתוח `http://127.0.0.1:8000/`.

בדיקות:

```bash
node --test
```

או `npm test`. אין התקנת חבילות.

## פריסה

הקבצים שצריך לפרסם נמצאים בשורש המאגר (`index.html` לצדם). אין פקודת בנייה. אם ממשק מבקש Build Command, משאירים אותו ריק. אם אי אפשר להשאיר ריק, כותבים `true`. תיקיית הפרסום היא `.` (שורש המאגר).

אין משתני סביבה. לא צריך `PORT`.

### Render: להעביר את השירות הקיים לאתר סטטי

השירות ב־https://lunaguna.onrender.com הוא Web Service (Python / FastAPI). בתוכנית החינמית שירות כזה נרדם, וההתעוררות איטית או נכשלת. Render לא ממיר Web Service ל־Static Site באותו שירות. יוצרים Static Site חדש, בודקים אותו, ואז מוציאים את הישן כדי לשחרר את הכתובת.

אחרי שהשינוי הזה נמצא על `main`, דיפלוי של שירות ה־Python הישן ייכשל כי `main.py` כבר לא קיים. דיפלוי שנכשל לא מוחק את הגרסה הקודמת שעדיין רצה. צריך לכבות את הישן בכוונה, אחרת המבקרים ממשיכים להגיע לשרת שנרדם.

1. ממזגים את השינוי ל־`main` ודוחפים ל־GitHub.
2. ב־Render Dashboard בוחרים **New +** ואז **Static Site**. לא Web Service.
3. מחברים את הריפו `bonda007/LunaGuna`.
4. ממלאים:
   - **Name:** `lunaguna-static`  
     השם `lunaguna` תפוס על ידי השירות הישן, ולכן אי אפשר לקחת אותו עדיין.
   - **Branch:** `main`
   - **Root Directory:** ריק
   - **Build Command:** ריק. אם הטופס דורש ערך, `true`
   - **Publish Directory:** `.`
   - בלי משתני סביבה. לא מעתיקים `PORT` או `ENVIRONMENT`.
5. **Create Static Site**, וממתינים עד שהסטטוס **Live**.
6. פותחים את כתובת ה־`onrender.com` החדשה. הדף אמור להופיע מיד, גם אחרי רענון. שומרים תאריך, פותחים את הלוח, ופותחים הגדרות.
7. משחררים את הכתובת הישנה:
   - נכנסים לשירות ה־Web Service הישן, **Settings**.
   - אחרי שהאתר החדש עובד: או משנים את **Name** ל־`lunaguna-old`, או גוללים ל־**Delete Web Service** ומוחקים.  
     **Suspend** לא משחרר את השם. מחיקה מוחקת את השירות ב־Render, לא את הקוד ב־GitHub.
8. באתר הסטטי: **Settings** → **Name** → `lunaguna` → שומרים.  
   הכתובת הופכת ל־https://lunaguna.onrender.com.
9. פותחים שוב את הכתובת ומוודאים שהאפליקציה עולה מיד.

אם יש דומיין משלך על השירות הישן: מעבירים אותו ב־**Settings → Custom Domains** אל האתר הסטטי לפני המחיקה.

`render.yaml` מתאר את אותו אתר סטטי, למי שיוצר Blueprint חדש. לא מפעילים אותו כשינוי runtime על שירות ה־Python הקיים.

אתר סטטי ב־Render יושב על CDN. אין תהליך שצריך להתעורר.

### Render, in English

The current https://lunaguna.onrender.com service is a Python web service. On the free tier that process sleeps. Render cannot turn that web service into a static site in place.

1. Merge this change to `main` and push.
2. In the Render dashboard choose **New +** → **Static Site**. Do not choose Web Service.
3. Connect `bonda007/LunaGuna`.
4. Settings:
   - **Name:** `lunaguna-static` (the name `lunaguna` is still taken)
   - **Branch:** `main`
   - **Root Directory:** empty
   - **Build Command:** empty, or `true` if the form requires a value
   - **Publish Directory:** `.`
   - No environment variables
5. **Create Static Site** and wait until it is **Live**.
6. Open the new URL. It should render immediately, including after a reload. Save a date, open the calendar, and open Settings.
7. On the old web service, open **Settings**. After the new site works, either rename it to `lunaguna-old` or **Delete Web Service**. Suspend does not free the name. Deleting the service does not delete the GitHub repo.
8. On the static site, **Settings → Name → `lunaguna`**. The public URL becomes https://lunaguna.onrender.com.
9. Open that URL again.

Move a custom domain under **Settings → Custom Domains** before deleting the old service. `render.yaml` is only for creating a new static Blueprint, not for changing the runtime of the existing Python service.

A failed deploy of the old Python service keeps the previous deploy online. Retire that service on purpose, or visitors still hit the sleeping app.

### GitHub Pages

אין צורך בקובץ הגדרות. במאגר יש `.nojekyll`.

1. בריפו: **Settings → Pages**.
2. **Build and deployment → Source:** Deploy from a branch.
3. **Branch:** `main`, folder **`/ (root)`**.
4. Save. האתר יעלה ב־`https://bonda007.github.io/LunaGuna/`.

הנתיבים יחסיים, אז זה עובד גם כשהאתר לא בשורש הדומיין.

### Vercel

1. **Add New → Project** ובוחרים את הריפו.
2. **Framework Preset:** Other.
3. **Build Command** ריק. **Output Directory** ריק (שורש הריפו).
4. Deploy.

אין `vercel.json`. אין חבילות להתקנה.

### Netlify

1. **Add new site → Import an existing project** ובוחרים את הריפו.
2. **Build command** ריק.
3. **Publish directory:** `.`
4. Deploy.

אין `netlify.toml`.

## למה השרת ירד

`main.py` הגיש את `static/index.html` ובדיקת `/health`. חישוב הגונה ישב כולו ב־JavaScript בדפדפן. השרת לא שמר נתונים ולא חישב כלום, אבל בתוכנית החינמית של Render הוא נרדם. אתר סטטי מגיש את אותם קבצים בלי תהליך.

הגופנים Heebo ו־Frank Ruhl Libre יושבים בתיקייה `fonts/` תחת רישיון SIL Open Font License (`fonts/OFL-Heebo.txt`, `fonts/OFL-FrankRuhlLibre.txt`). אין קריאה ל־Google Fonts.

אחרי ביקור אחד, service worker שומר את קבצי האפליקציה במכשיר כדי שאפשר יהיה לפתוח אותה גם בלי רשת. שום נתון אישי לא נשמר שם.
