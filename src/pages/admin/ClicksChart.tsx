import { useState } from "react";

interface Point { day: string; value: number }

// Single-series bar chart: one hue, thin bars with rounded tops, recessive
// grid, per-bar hover tooltip. The table below it is the accessible view.
export default function ClicksChart({ data, empty = "No clicks recorded yet.", unit = "clicks" }: { data: Point[]; empty?: string; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="text-sm text-slate-500">{empty}</p>;

  const W = 640, H = 200, padL = 32, padB = 22, padT = 8;
  const max = Math.max(...data.map((d) => d.value), 1);
  const nice = Math.ceil(max / 5) * 5;
  const plotW = W - padL, plotH = H - padB - padT;
  const slot = plotW / data.length;
  const barW = Math.min(28, slot - 2);
  const y = (v: number) => padT + plotH - (v / nice) * plotH;
  const ticks = [0, nice / 2, nice];
  const label = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${unit} per day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#64748b">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const top = y(d.value);
          const h = padT + plotH - top;
          const r = Math.min(4, h, barW / 2);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`}
                  fill="#059669" opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 7) === 0) && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#64748b">{label(d.day)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-slate-900 px-2 py-1 text-xs text-white shadow"
          style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%`, transform: "translateX(-50%)" }}>
          {label(data[hover].day)}: <b>{data[hover].value}</b> {unit}
        </div>
      )}
    </div>
  );
}
