import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  className?: string;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

function fmt(t: number) {
  if (!isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayer({ src, className }: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => !scrubbing && setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [scrubbing]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (ref.current) {
      ref.current.volume = volume;
      ref.current.muted = muted;
    }
  }, [volume, muted]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const skip = (delta: number) => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(duration, a.currentTime + delta));
    setCurrent(a.currentTime);
  };

  const seekFromEvent = (clientX: number) => {
    const a = ref.current;
    const bar = barRef.current;
    if (!a || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = pct * duration;
    setCurrent(t);
    a.currentTime = t;
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-4",
        className,
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        className="hidden"
      />

      {/* Scrubber */}
      <div
        ref={barRef}
        className="group relative h-2 cursor-pointer rounded-full bg-border"
        onMouseDown={(e) => {
          setScrubbing(true);
          seekFromEvent(e.clientX);
          const move = (ev: MouseEvent) => seekFromEvent(ev.clientX);
          const up = () => {
            setScrubbing(false);
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${pct}%` }}
        />
      </div>

      {/* Times */}
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{fmt(current)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => skip(-10)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Back 10s"
        >
          <SkipBack className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Forward 10s"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <div className="ml-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              setMuted(false);
            }}
            className="h-1 w-20 cursor-pointer accent-primary"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
