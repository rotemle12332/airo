// Lightweight i18n for Airo (English / Hebrew)
// Auto-detects browser language and direction, with optional manual override.

import * as React from "react";

export type Lang = "en" | "he";

type Dict = Record<string, string>;

const en: Dict = {
  "app.tagline": "Effortless AI Travel Engineering",
  "home.pastTrips": "Past Trips",
  "home.noTrips": "Your future journeys will live here.",
  "home.launch": "Launch New Journey",
  "home.signIn": "Sign in",
  "home.signOut": "Sign out",

  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.displayName": "Your name",
  "auth.fullName": "Full Name",
  "auth.emailAddress": "Email Address",
  "auth.createPassword": "Create Password",
  "auth.createAccount": "Create your account",
  "auth.createAccountCta": "Create Account",
  "auth.welcomeBack": "Welcome back",
  "auth.startJourney": "Start your journey with Airo.",
  "auth.continueJourney": "Log in to continue your journeys.",
  "auth.logIn": "Log In",
  "auth.forgotPassword": "Forgot password?",
  "auth.orContinueWith": "or continue with",
  "auth.haveAccount": "Already have an account?",
  "auth.noAccount": "Don't have an account?",
  "auth.toSignUp": "New to Airo? Create an account",
  "auth.toSignIn": "Already have an account? Sign in",
  "auth.continue": "Continue",
  "auth.welcome": "Welcome to Airo",
  "auth.subtitle": "Your private AI travel concierge.",

  "trip.new.title": "Initialize a new journey",
  "trip.new.subtitle": "Tell Airo where you're starting from. The rest unfolds inside.",
  "trip.new.tripTitle": "Trip name",
  "trip.new.origin": "Origin city",
  "trip.new.startDate": "Start date",
  "trip.new.endDate": "End date",
  "trip.new.travelers": "Travelers",
  "trip.new.create": "Begin",

  "wizard.skip": "Skip",
  "wizard.next": "Next",
  "wizard.step1.title": "When are you flying?",
  "wizard.step1.subtitle": "Help us find the perfect time for your journey.",
  "wizard.step1.departure": "Departure",
  "wizard.step1.return": "Return",
  "wizard.step1.flexible": "I'm flexible",
  "wizard.step1.flexibleSub": "Show me the best dates",
  "wizard.step2.title": "Where would you like to go?",
  "wizard.step2.subtitle": "Dream it. We'll take care of the details.",
  "wizard.step2.search": "Search any city, country or place",
  "wizard.step2.popular": "Popular Destinations",
  "wizard.step3.title": "What's your travel style?",
  "wizard.step3.subtitle": "This helps us tailor everything to you.",
  "wizard.step3.mix": "Show me a mix of everything",
  "wizard.step4.title": "Who are you traveling with?",
  "wizard.step4.subtitle": "So we can create the perfect experience for everyone.",
  "wizard.step4.kids": "Traveling with kids?",
  "wizard.step4.kidsSub": "We'll keep that in mind",
  "wizard.step5.title": "What's your vibe?",
  "wizard.step5.subtitle": "The little things that make a big difference.",
  "wizard.step5.notes": "Anything else we should know?",
  "wizard.step5.optional": "Optional",
  "wizard.step6.title": "Set your budget range",
  "wizard.step6.subtitle": "We'll work magic within what works for you.",
  "wizard.step6.totalBudget": "Total budget for this trip (per person)",
  "wizard.step6.cta": "Let Airo plan my dream trip",
  "wizard.step6.ctaSub": "Sit back, relax, and get ready!",

  "stage.flights": "Flights",
  "stage.hotels": "Hotels",
  "stage.attractions": "Attractions",

  "drawer.title": "Tell Airo what you're imagining",
  "drawer.placeholder": "e.g. Direct flights to Japan in March",
  "drawer.placeholder.hotel": "e.g. Near Shinjuku, luxury vibe",
  "drawer.placeholder.attraction": "e.g. Quiet rooftop bars and family museums",
  "drawer.dropImage": "Drop a photo of a place — Airo will recognise it",
  "drawer.generate": "Curate options",
  "drawer.thinking": "Airo is curating",

  "basket.liveTotal": "Live Total",
  "basket.empty": "Nothing in your itinerary yet",
  "basket.bestValue": "Best Value",
  "basket.add": "Add to itinerary",
  "basket.added": "Added",
  "basket.remove": "Remove",
  "basket.next": "Continue",
  "basket.review": "Review itinerary",

  "review.title": "Your Airo Itinerary",
  "review.export": "Export Airo Itinerary",
  "review.exporting": "Crafting your PDF",
  "review.empty": "Add some flights, hotels, or attractions to see your timeline.",

  "shared.title": "Shared journey",
  "shared.import": "Import to my Airo",
  "shared.imported": "Added to your trips",

  "common.back": "Back",
  "common.loading": "Loading",
  "common.error": "Something went wrong",
};

const he: Dict = {
  "app.tagline": "תכנון נסיעות חכם, שקט ומדויק",
  "home.pastTrips": "נסיעות קודמות",
  "home.noTrips": "כאן יופיעו הנסיעות העתידיות שלך.",
  "home.launch": "התחילו מסע חדש",
  "home.signIn": "התחברות",
  "home.signOut": "התנתקות",

  "auth.signIn": "התחברות",
  "auth.signUp": "הרשמה",
  "auth.email": 'דוא"ל',
  "auth.password": "סיסמה",
  "auth.displayName": "השם שלך",
  "auth.fullName": "שם מלא",
  "auth.emailAddress": 'דוא"ל',
  "auth.createPassword": "בחרו סיסמה",
  "auth.createAccount": "יצירת חשבון",
  "auth.createAccountCta": "צור חשבון",
  "auth.welcomeBack": "ברוכים השבים",
  "auth.startJourney": "התחילו את המסע שלכם עם Airo.",
  "auth.continueJourney": "התחברו כדי להמשיך את המסעות שלכם.",
  "auth.logIn": "התחברות",
  "auth.forgotPassword": "שכחת סיסמה?",
  "auth.orContinueWith": "או המשיכו עם",
  "auth.haveAccount": "כבר יש חשבון?",
  "auth.noAccount": "אין לכם חשבון?",
  "auth.toSignUp": "חדש ב-Airo? צרו חשבון",
  "auth.toSignIn": "כבר יש חשבון? התחברו",
  "auth.continue": "המשך",
  "auth.welcome": "ברוכים הבאים ל-Airo",
  "auth.subtitle": "הקונסיירז' הפרטי שלכם לתכנון נסיעות.",

  "trip.new.title": "מסע חדש",
  "trip.new.subtitle": "ספרו ל-Airo מאיפה מתחילים. השאר מתגלגל בפנים.",
  "trip.new.tripTitle": "שם המסע",
  "trip.new.origin": "עיר מוצא",
  "trip.new.startDate": "תאריך יציאה",
  "trip.new.endDate": "תאריך חזרה",
  "trip.new.travelers": "מטיילים",
  "trip.new.create": "התחל",

  "wizard.skip": "דלג",
  "wizard.next": "המשך",
  "wizard.step1.title": "מתי אתם טסים?",
  "wizard.step1.subtitle": "עזרו לנו למצוא את הזמן המושלם למסע שלכם.",
  "wizard.step1.departure": "יציאה",
  "wizard.step1.return": "חזרה",
  "wizard.step1.flexible": "אני גמיש",
  "wizard.step1.flexibleSub": "הראו לי את התאריכים הכי טובים",
  "wizard.step2.title": "לאן תרצו לטוס?",
  "wizard.step2.subtitle": "חלמו את זה. אנחנו נדאג לפרטים.",
  "wizard.step2.search": "חפשו עיר, מדינה או מקום",
  "wizard.step2.popular": "יעדים פופולריים",
  "wizard.step3.title": "מה הסגנון שלכם?",
  "wizard.step3.subtitle": "זה עוזר לנו להתאים הכל בדיוק עבורכם.",
  "wizard.step3.mix": "הראו לי תמהיל מהכל",
  "wizard.step4.title": "עם מי אתם טסים?",
  "wizard.step4.subtitle": "כדי שניצור את החוויה המושלמת לכולם.",
  "wizard.step4.kids": "מטיילים עם ילדים?",
  "wizard.step4.kidsSub": "ניקח את זה בחשבון",
  "wizard.step5.title": "מה הוויב שלכם?",
  "wizard.step5.subtitle": "הדברים הקטנים שעושים הבדל גדול.",
  "wizard.step5.notes": "עוד משהו שכדאי לדעת?",
  "wizard.step5.optional": "אופציונלי",
  "wizard.step6.title": "הגדירו טווח תקציב",
  "wizard.step6.subtitle": "נעשה קסמים בתוך מה שמתאים לכם.",
  "wizard.step6.totalBudget": "תקציב כולל למסע (לאדם)",
  "wizard.step6.cta": "תנו ל-Airo לתכנן את המסע ✨",
  "wizard.step6.ctaSub": "תירגעו, אנחנו על זה!",

  "stage.flights": "טיסות",
  "stage.hotels": "מלונות",
  "stage.attractions": "אטרקציות",

  "drawer.title": "מה אתם מדמיינים?",
  "drawer.placeholder": "למשל: טיסות ישירות ליפן במרץ",
  "drawer.placeholder.hotel": "למשל: ליד שינג'וקו, יוקרתי",
  "drawer.placeholder.attraction": "למשל: גגות שקטים ומוזיאונים למשפחה",
  "drawer.dropImage": "גררו תמונה של מקום — Airo יזהה אותו",
  "drawer.generate": "הציעו אפשרויות",
  "drawer.thinking": "Airo עובד",

  "basket.liveTotal": 'סה"כ עכשיו',
  "basket.empty": "עדיין לא נוסף שום פריט",
  "basket.bestValue": "ערך מצוין",
  "basket.add": "הוסיפו למסלול",
  "basket.added": "נוסף",
  "basket.remove": "הסר",
  "basket.next": "המשך",
  "basket.review": "סקירת מסלול",

  "review.title": "המסלול שלך ב-Airo",
  "review.export": "ייצוא PDF של המסלול",
  "review.exporting": "מכינים את ה-PDF",
  "review.empty": "הוסיפו טיסות, מלונות או אטרקציות לראות את ציר הזמן.",

  "shared.title": "מסע משותף",
  "shared.import": "הוסיפו ל-Airo שלי",
  "shared.imported": "נוסף לנסיעות שלך",

  "common.back": "חזרה",
  "common.loading": "טוען",
  "common.error": "משהו השתבש",
};

const dictionaries: Record<Lang, Dict> = { en, he };

const STORAGE_KEY = "airo:lang";

export function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored === "en" || stored === "he") return stored;
  const nav = window.navigator?.language || "en";
  return nav.toLowerCase().startsWith("he") ? "he" : "en";
}

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return lang === "he" ? "rtl" : "ltr";
}

type I18nContextValue = {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (key: string) => string;
  setLang: (l: Lang) => void;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("en");

  React.useEffect(() => {
    const detected = detectLang();
    setLangState(detected);
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);

  const setLang = React.useCallback((l: Lang) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
    setLangState(l);
  }, []);

  const t = React.useCallback(
    (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    [lang],
  );

  const value = React.useMemo(
    () => ({ lang, dir: dirOf(lang), t, setLang }),
    [lang, t, setLang],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
