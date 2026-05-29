import { ArrowDown, ArrowUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  delta?: number | null;
  trend?: number[];
  icon: ReactNode;
  accent: "blue" | "purple" | "green" | "orange";
}

const ACCENTS: Record<Props["accent"], { bg: string; fg: string; stroke: string }> = {
  blue: { bg: "bg-primary/10", fg: "text-primary", stroke: "var(--primary)" },
  purple: { bg: "bg-chart-2/10", fg: "text-chart-2", stroke: "var(--chart-2)" },
  green: { bg: "bg-success/10", fg: "text-success", stroke: "var(--success)" },
  orange: { bg: "bg-warning/10", fg: "text-warning", stroke: "var(--warning)" },
};

export function StatCard({ label, value, delta, trend, icon, accent }: Props) {
  const a = ACCENTS[accent];
  const trendData = (trend ?? []).map((v, i) => ({ i, v }));
  const showDelta = typeof delta === "number" && isFinite(delta);
  const positive = (delta ?? 0) >= 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", a.bg, a.fg)}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {showDelta ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta!).toFixed(0)}% vs last week
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No prior period</div>
        )}
        {trendData.length > 1 && (
          <div className="h-8 w-20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={a.stroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
