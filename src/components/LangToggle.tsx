import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "he" : "en")}
      className="rounded-full text-xs font-medium"
      aria-label="Toggle language"
    >
      {lang === "en" ? "עב" : "EN"}
    </Button>
  );
}
