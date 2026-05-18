## מיפוי המסכים מה-HTML למסכי האפליקציה

ה-HTML שהעלית מכיל **13 מסכים מעוצבים** (Material 3 + Glassmorphism, פונטים Plus Jakarta Sans + Noto Serif, פלטה כחול/סגול/כתום). הנה איך אני מציע למפות אותם:

| # | מסך ב-HTML | יעד באפליקציה | מצב נוכחי |
|---|-----------|--------------|-----------|
| 1 | Welcome Back (Login) | `src/routes/auth.tsx` (mode=login) | קיים – לעצב מחדש |
| 2 | Create Account | `src/routes/auth.tsx` (mode=signup) | קיים – לעצב מחדש |
| 3 | Home - Launch Journey + Past Journeys | `src/routes/index.tsx` | קיים – לעצב מחדש |
| 4 | Step 1: When Are You Flying? (תאריכים) | `trip.new.tsx` – שלב dates | קיים בתוך wizard |
| 5 | Step 2: Where to Go? (יעד + carousel) | `trip.new.tsx` – שלב destination | קיים |
| 6 | Step 3: Travel Style (Luxury/Adventure/Foodie…) | `trip.new.tsx` – שלב style | חדש – להוסיף |
| 7 | Step 4: Traveling With? (Solo/Couple/Family) | `trip.new.tsx` – שלב travelers | קיים |
| 8 | Step 5: Travel Vibe (Relaxed→YOLO) | `trip.new.tsx` – שלב vibe | חדש – להוסיף |
| 9 | Step 6: Budget Range (סליידר) | `trip.new.tsx` – שלב budget | קיים |
| 10 | Select Departure & Arrival (From/To) | `trip.new.tsx` – שלב route | חדש – להוסיף |
| 11 | Select Flights (כרטיסי טיסה) | `trip.$tripId.plan.tsx` – stage=flights | קיים |
| 12 | Select Hotel (Bento + Glass) | `trip.$tripId.plan.tsx` – stage=hotels | קיים |
| 13 | Select Attractions (Bento + AI bubble) | `trip.$tripId.plan.tsx` – stage=attractions | קיים |

## גישה (כיצד אני מתכוון לבצע)

1. **טוקנים גלובליים תחילה** — להעביר את פלטת הצבעים והפונטים מה-HTML ל-`src/styles.css` (Plus Jakarta Sans + Noto Serif, primary `#004ac6`, accent כתום `#fea619`, סגול `#632ecd`) ולשמור במערכת tokens. ככה כל המסכים יראו אחיד מיד.
2. **שכבת shell משותפת** — TopAppBar + Progress Stepper + BottomNav שחוזרים בכל מסך → להוציא ל-`src/components/` (`TopAppBar.tsx`, `WizardProgress.tsx`, `BottomNav.tsx`). מבטיח עקביות ומשתמש בקוד הקיים של `StageProgress`.
3. **התאמת מסכים אחד-אחד** לפי הסדר:
   - Auth (login + signup) → state ל-Supabase auth שכבר קיים
   - Index/Home → לטעון את `trips` של המשתמש מ-Supabase ולהציג כ-Past Journeys
   - Trip wizard → להחליף את ה-UI של כל שלב, לשמור את ה-state machine הקיים. שלבים חדשים (Style/Vibe/Route) ירחיבו את ה-schema של `trip_brief`.
   - Plan stages (flights/hotels/attractions) → להחליף את עיצוב הכרטיסים אבל לשמר את ה-hook ל-`useLocalAgent` (WebLLM) שהוספנו.
4. **שמירה על פונקציונליות**: כל ה-logic הקיים (auth, Supabase, WebLLM local agent, i18n he/en + RTL, שמירת trip, share token, PDF) נשאר. רק שכבת ה-UI משתנה.
5. **RTL**: המסכים ב-HTML הם LTR בלבד. אדאג שכל הקלאסים יהיו logical (`ps-`/`pe-`/`start-`/`end-`) כדי שהמצב העברי ימשיך לעבוד.
6. **תמונות**: המסכים משתמשים בתמונות Hero מ-Unsplash/placeholders. אשתמש ב-`imagegen` ליצירת תמונות מותג עקביות עבור hero ב-index ו-auth, ולמקומות שאר אשתמש בתמונות שכבר במסכים.

## נושאים טכניים שכדאי לדעת

- **Material Symbols Outlined** ב-HTML → אני לא אטען font משלוח חיצוני; אמיר את האייקונים ל-`lucide-react` שכבר מותקן.
- **CDN Tailwind config** ב-HTML → לא נעתיק אותו; הצבעים יהפכו ל-CSS variables ב-`src/styles.css` (פורמט oklch) ויהיו זמינים דרך semantic tokens (`bg-primary`, `text-on-surface` וכו').
- ה-wizard כיום עם X שלבים — נצטרך להוסיף את Style, Vibe, ו-From/To. זה דורש הוספת שדות ל-state ולעמודות ב-`trips` (migration קצר).
- בלי דחיפת רעיונות שכבר נדחו: ה-AI נשאר **לוקאלי בלבד** (WebLLM), בלי קריאות ענן.

## מה לא בתכולה

- שינוי logic של AI / Supabase / auth flow.
- הוספת מסכים שאינם ב-HTML (settings, profile וכו').
- תרגום הקופי החדש מה-HTML — אעביר את כל הטקסטים החדשים ל-`i18n.ts` עם he+en.

## האם להמשיך?

זו עבודה רחבה (כ-13 מסכים + טוקנים + migration קטן). אם תאשר, אבצע בסדר הזה: tokens → shell components → auth → index → wizard → plan. תוכל לעצור בכל שלב ולומר "מספיק" או "תקפוץ ישר ל-X".
