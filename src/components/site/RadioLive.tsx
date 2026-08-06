import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Radio, Volume2, ExternalLink } from "lucide-react";

/**
 * Plugin « Le Direct Radio ».
 * Deux stations : Top Congo FM 88.4 et Radio Okapi.
 * Chaque station a une ou plusieurs sources (bascule auto) + un lien externe de secours.
 */
export type RadioStation = {
  id: string;
  name: string;
  short: string;
  sources: string[];
  external: string;
};

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: "topcongo",
    name: "Top Congo FM 88.4",
    short: "Top Congo",
    sources: [
      "https://mpbradio.ice.infomaniak.ch/topcongo3-128.mp3",
      "https://mpbradio.ice.infomaniak.ch/topcongo3-64.mp3",
    ],
    external: "https://radio.garden/listen/top-congo-fm-88-4/99oEZY6q?hl=fr",
  },
  {
    id: "okapi",
    name: "Radio Okapi",
    short: "Okapi",
    // Flux d'origine en HTTP : relayé en HTTPS par le site.
    sources: ["/api/public/radio/okapi"],
    external: "https://www.radiookapi.net/",
  },
];

export const RADIO_STREAM_URL = RADIO_STATIONS[0]!.sources[0]!;

type Props = { className?: string; compact?: boolean };

const STORAGE_KEY = "reelactu:radio-station";

export function RadioLive({ className = "", compact = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceIndexRef = useRef(0);
  const [stationIndex, setStationIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const station = RADIO_STATIONS[stationIndex]!;
  const stationRef = useRef(station);
  stationRef.current = station;

  // Restaure le choix après rechargement (après hydratation pour éviter tout mismatch SSR).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const idx = RADIO_STATIONS.findIndex((s) => s.id === saved);
      if (idx > 0) {
        setStationIndex(idx);
        stationRef.current = RADIO_STATIONS[idx]!;
      }
    } catch {
      /* stockage indisponible (navigation privée iOS) */
    }
  }, []);


  const startSource = useCallback(async (index: number) => {
    const audio = audioRef.current;
    const url = stationRef.current.sources[index];
    if (!audio || !url) {
      setLoading(false);
      setError("Flux indisponible");
      return;
    }
    sourceIndexRef.current = index;
    setLoading(true);
    setError(null);
    // Cache-buster léger pour repartir du direct et non d'un tampon figé.
    audio.src = `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
    try {
      await audio.play();
    } catch {
      if (index + 1 < stationRef.current.sources.length) {
        void startSource(index + 1);
        return;
      }
      setLoading(false);
      setError("Lecture impossible");
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => {
      setPlaying(true);
      setLoading(false);
      setError(null);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      const next = sourceIndexRef.current + 1;
      if (next < stationRef.current.sources.length) {
        void startSource(next);
        return;
      }
      setPlaying(false);
      setLoading(false);
      setError("Flux indisponible");
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, [startSource]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    void startSource(0);
  };

  const selectStation = (index: number) => {
    if (index === stationIndex) return;
    const wasPlaying = playing;
    audioRef.current?.pause();
    setStationIndex(index);
    setError(null);
    stationRef.current = RADIO_STATIONS[index]!;
    try {
      window.localStorage.setItem(STORAGE_KEY, RADIO_STATIONS[index]!.id);
    } catch {
      /* stockage indisponible */
    }
    if (wasPlaying) void startSource(0);
  };


  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Couper ${station.name}` : `Écouter ${station.name} en direct`}
        aria-pressed={playing}
        className="grid size-10 shrink-0 lg:size-11 place-items-center rounded-full border-2 border-signal-foreground/70 bg-signal-foreground/10 text-signal-foreground transition-colors hover:bg-signal-foreground hover:text-signal"
      >
        {playing ? (
          <Pause className="size-5" />
        ) : (
          <Play className="size-5 translate-x-[1px]" />
        )}
      </button>

      <div className={`min-w-0 leading-tight ${compact ? "hidden lg:block" : ""}`}>
        <span className="hidden items-center gap-1.5 font-sans text-[0.7rem] font-bold tracking-[0.16em] text-signal-foreground/85 uppercase sm:flex">
          <Radio className="size-3 shrink-0" />
          Le Direct
          {playing ? (
            <span className="inline-flex items-center gap-1">
              <span className="ticker-dot" />
              <Volume2 className="size-3" />
            </span>
          ) : null}
        </span>

        <div
          role="radiogroup"
          aria-label="Basculer entre Top Congo et Radio Okapi"
          className="inline-flex items-stretch overflow-hidden rounded-full border border-signal-foreground/40"
        >
          {RADIO_STATIONS.map((s, idx) => {
            const active = stationIndex === idx;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectStation(idx)}
                className={`touch-manipulation px-3 py-1.5 font-sans text-[0.65rem] font-bold tracking-wide transition-all select-none sm:px-2.5 sm:py-1 ${
                  active
                    ? "bg-signal-foreground text-signal"
                    : "bg-transparent text-signal-foreground/80 hover:bg-signal-foreground/10"
                }`}
              >
                {s.short}
              </button>
            );
          })}
        </div>


        {loading ? (
          <span className="block font-sans text-[0.6rem] text-signal-foreground/80">
            Connexion…
          </span>
        ) : null}
        {error ? (
          <span className="block font-sans text-[0.6rem] text-signal-foreground/80">
            {error} ·{" "}
            <a
              href={station.external}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            >
              <ExternalLink className="size-2.5" />
              écouter ailleurs
            </a>
          </span>
        ) : null}
      </div>

      <a
        href={station.external}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Écouter ${station.name} sur le site de la station`}
        className={`grid size-8 shrink-0 place-items-center rounded-full border border-signal-foreground/50 text-signal-foreground transition-colors hover:bg-signal-foreground hover:text-signal sm:hidden ${compact ? "hidden" : ""}`}
      >
        <ExternalLink className="size-3.5" />
      </a>

      <audio ref={audioRef} preload="none" playsInline className="hidden" />
    </div>
  );
}
