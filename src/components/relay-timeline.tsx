import { cn } from "@/lib/utils";

export type TimelineNode = {
  time: string;
  label: string;
  sub?: string;
  tone?: "start" | "room" | "finish";
};

/**
 * The signature element: a horizontal, timed node-path showing how the night actually
 * moves through the building. This is the real mental model of the operation - CCRI feeds
 * PAO2, PAO1 relays into PAO2, PAO3 runs first on Wed/Sun - not a generic progress bar.
 */
export function RelayTimeline({ nodes, nowLabel }: { nodes: TimelineNode[]; nowLabel?: string }) {
  return (
    <div className="relative">
      {nowLabel && (
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Now &middot; <span className="text-signal-ink dark:text-signal">{nowLabel}</span>
        </p>
      )}
      <div className="scroll-thin overflow-x-auto pb-2">
        <div className="relative flex min-w-[640px] items-start">
          <div className="absolute left-0 right-0 top-[15px] h-px bg-steel-line" aria-hidden />
          {nodes.map((n, i) => (
            <div key={i} className="relative z-10 flex flex-1 flex-col items-start pr-6">
              <div
                className={cn(
                  "flex size-[15px] items-center justify-center rounded-full border-2",
                  n.tone === "finish"
                    ? "border-clean bg-clean-soft"
                    : n.tone === "room"
                      ? "border-signal bg-signal-soft"
                      : "border-ink bg-bg dark:border-signal"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    n.tone === "finish" ? "bg-clean" : n.tone === "room" ? "bg-signal" : "bg-ink dark:bg-signal"
                  )}
                />
              </div>
              <p className="mt-3 font-mono text-[11px] font-semibold tracking-wide text-ink-soft">{n.time}</p>
              <p className="mt-0.5 text-[13.5px] font-semibold text-ink">{n.label}</p>
              {n.sub && <p className="mt-0.5 text-[12px] text-ink-soft">{n.sub}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
