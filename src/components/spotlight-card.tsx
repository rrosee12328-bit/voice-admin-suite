import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** rgba/hex with alpha for the spotlight glow */
  glowColor?: string;
  /** spotlight radius in px */
  radius?: number;
}

/**
 * Premium card with a cursor-following radial spotlight.
 * Pure CSS variables updated on pointermove — no re-renders.
 */
export function SpotlightCard({
  children,
  className,
  glowColor = "color-mix(in oklab, var(--primary) 22%, transparent)",
  radius = 280,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--spot-opacity", "1");
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spot-opacity", "0");
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn(
        "group/spot relative overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset,0_30px_60px_-30px_rgb(0_0_0/0.08)]",
        "transition-colors",
        className,
      )}
      style={
        {
          "--spot-opacity": "0",
          "--spot-radius": `${radius}px`,
          "--spot-color": glowColor,
        } as React.CSSProperties
      }
    >
      {/* spotlight glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--spot-opacity)",
          background:
            "radial-gradient(var(--spot-radius) circle at var(--mx) var(--my), var(--spot-color), transparent 60%)",
        }}
      />
      {/* subtle border highlight that tracks cursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(180px circle at var(--mx) var(--my), color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "1px",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
