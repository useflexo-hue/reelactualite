import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2 } from "lucide-react";
import { translateArticle, type TranslateResult } from "@/lib/translate.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const LANGUAGES = [
  { code: "fr", label: "Français (original)" },
  // Langues nationales & régionales
  { code: "sw", label: "Kiswahili" },
  { code: "ln", label: "Lingala" },
  { code: "kg", label: "Kikongo" },
  { code: "lu", label: "Tshiluba" },
  { code: "rw", label: "Kinyarwanda" },
  { code: "lg", label: "Luganda" },
  { code: "am", label: "አማርኛ (Amharique)" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yorùbá" },
  { code: "zu", label: "isiZulu" },
  { code: "so", label: "Soomaali" },
  // Langues internationales
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "he", label: "עברית" },
  { code: "fa", label: "فارسی" },
  { code: "hi", label: "हिन्दी" },
  { code: "bn", label: "বাংলা" },
  { code: "ur", label: "اردو" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "zh", label: "中文 (简体)" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];


type Props = {
  slug: string;
  title: string;
  dek: string | null;
  body: string;
  onTranslated: (lang: string, data: TranslateResult | null) => void;
};

const STORAGE_KEY = "reelactu:lang";

/** Retourne le code langue supporté correspondant au navigateur, sinon null. */
export function detectBrowserLang(): string | null {
  if (typeof navigator === "undefined") return null;
  const prefs = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const pref of prefs) {
    const base = String(pref).toLowerCase().split("-")[0];
    const match = LANGUAGES.find((l) => l.code === base);
    if (match) return match.code;
  }
  return null;
}

export function ArticleTranslate({ slug, title, dek, body, onTranslated }: Props) {
  const run = useServerFn(translateArticle);
  const [lang, setLang] = useState("fr");
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(false);
  const cache = useRef<Record<string, TranslateResult>>({});
  const bootstrapped = useRef(false);

  const handleChange = useCallback(
    async (next: string, isAuto = false) => {
      setLang(next);
      setAuto(isAuto);
      // Mémorise systématiquement la langue (détectée ou choisie) :
      // à la prochaine visite elle prime sur la langue du navigateur.
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      if (next === "fr") {
        onTranslated("fr", null);
        return;
      }
      if (cache.current[next]) {
        onTranslated(next, cache.current[next]);
        return;
      }
      const label = LANGUAGES.find((l) => l.code === next)?.label ?? next;
      setLoading(true);
      try {
        const result = (await run({
          data: { slug, lang: label, title, dek, body },
        })) as TranslateResult;
        cache.current[next] = result;
        onTranslated(next, result);
      } catch (e) {
        setLang("fr");
        setAuto(false);
        onTranslated("fr", null);
        if (!isAuto) toast.error(e instanceof Error ? e.message : "Traduction impossible");
      } finally {
        setLoading(false);
      }
    },
    [body, dek, onTranslated, run, slug, title],
  );

  // Préférence enregistrée en priorité, sinon détection navigateur (puis mémorisée).
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const isKnown = saved ? LANGUAGES.some((l) => l.code === saved) : false;
    if (isKnown) {
      if (saved !== "fr") void handleChange(saved!, false);
      return;
    }
    const detected = detectBrowserLang();
    if (detected && detected !== "fr") {
      void handleChange(detected, true);
    } else if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "fr");
    }
  }, [handleChange]);


  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-muted-foreground">
      <Languages className="h-4 w-4 text-signal" aria-hidden />
      <span className="hidden sm:inline">Lire dans votre langue :</span>
      <Select
        value={lang}
        onValueChange={(v) => void handleChange(v)}
        disabled={loading}
      >
        <SelectTrigger className="h-8 w-[190px] text-xs" aria-label="Choisir la langue de lecture">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code} className="text-xs">
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading ? (
        <span className="flex items-center gap-1 text-signal">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Traduction…
        </span>
      ) : null}
      {!loading && auto && lang !== "fr" ? (
        <span className="flex items-center gap-2">
          <span className="italic">Traduit automatiquement selon votre navigateur</span>
          <button
            type="button"
            onClick={() => void handleChange("fr")}
            className="font-semibold text-signal underline underline-offset-2"
          >
            Voir l'original
          </button>
        </span>
      ) : null}
    </div>
  );

}
