import { COLORS } from "@/lib/protocol";

type LinePoint = { x: string | number; y: number };
type BarPoint = { x: string | number; y: number; color?: string; label?: string };
type GroupedPoint = { x: string | number; a: number; b: number };
type HorizontalPoint = { y: string; x: number; label?: string };

const W = 920;
const H = 360;
const P = { top: 34, right: 34, bottom: 48, left: 58 };

export function LineChart({
  title,
  data,
  color,
  yMax,
  reference,
  referenceLabel,
  xLabel,
  yLabel,
}: {
  title: string;
  data: LinePoint[];
  color: string;
  yMax?: number;
  reference?: number;
  referenceLabel?: string;
  xLabel?: string;
  yLabel?: string;
}) {
  const maxY = yMax ?? Math.max(55, ...data.map((item) => item.y + 10));
  const coords = data.map((item, index) => ({
    ...item,
    px: xForIndex(index, data.length),
    py: yForValue(item.y, maxY),
  }));
  const path = coords.map((item, index) => `${index ? "L" : "M"} ${item.px} ${item.py}`).join(" ");

  return (
    <div className="chart-panel">
      <h3 className="chart-title">{title}</h3>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <Grid maxY={maxY} />
        {reference !== undefined ? <ReferenceLine value={reference} maxY={maxY} label={referenceLabel} /> : null}
        <path d={path} fill="none" stroke={color} strokeWidth="3" />
        {coords.map((item) => (
          <g key={item.x}>
            <circle cx={item.px} cy={item.py} r="5" fill={color} />
            <text x={item.px} y={item.py - 10} textAnchor="middle" className="tick">
              {item.y}%
            </text>
          </g>
        ))}
        <Axes xValues={data.map((item) => item.x)} maxY={maxY} xLabel={xLabel} yLabel={yLabel} />
      </svg>
    </div>
  );
}

export function GroupedBarChart({
  title,
  data,
  aName,
  bName,
  aColor = COLORS.f,
  bColor = COLORS.m,
  yLabel,
}: {
  title: string;
  data: GroupedPoint[];
  aName: string;
  bName: string;
  aColor?: string;
  bColor?: string;
  yLabel?: string;
}) {
  const maxY = Math.max(10, ...data.flatMap((item) => [item.a, item.b])) * 1.18;
  const slot = (W - P.left - P.right) / data.length;
  const barW = Math.min(34, slot * 0.28);

  return (
    <div className="chart-panel">
      <h3 className="chart-title">{title}</h3>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <Grid maxY={maxY} />
        {data.map((item, index) => {
          const center = xForIndex(index, data.length);
          const aH = H - P.bottom - yForValue(item.a, maxY);
          const bH = H - P.bottom - yForValue(item.b, maxY);
          return (
            <g key={item.x}>
              <rect x={center - barW - 3} y={H - P.bottom - aH} width={barW} height={aH} fill={aColor} />
              <rect x={center + 3} y={H - P.bottom - bH} width={barW} height={bH} fill={bColor} />
              <text x={center} y={H - P.bottom + 18} textAnchor="middle" className="tick">
                {item.x}
              </text>
            </g>
          );
        })}
        <YAxis maxY={maxY} yLabel={yLabel} />
      </svg>
      <Legend items={[{ label: aName, color: aColor }, { label: bName, color: bColor }]} />
    </div>
  );
}

export function BarChart({
  title,
  data,
  yLabel,
  referenceLines = [],
}: {
  title: string;
  data: BarPoint[];
  yLabel?: string;
  referenceLines?: { value: number; label?: string; color?: string }[];
}) {
  const values = data.map((item) => item.y);
  const maxAbs = Math.max(10, ...values.map(Math.abs), ...referenceLines.map((item) => Math.abs(item.value)));
  const minY = Math.min(0, ...values, ...referenceLines.map((item) => item.value));
  const maxY = Math.max(0, maxAbs);
  const scale = (value: number) => P.top + ((maxY - value) / (maxY - minY || 1)) * (H - P.top - P.bottom);
  const zero = scale(0);
  const slot = (W - P.left - P.right) / data.length;
  const barW = Math.min(46, slot * 0.55);

  return (
    <div className="chart-panel">
      <h3 className="chart-title">{title}</h3>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <line x1={P.left} y1={zero} x2={W - P.right} y2={zero} stroke="#111" strokeWidth="1" />
        {referenceLines.map((line) => {
          const y = scale(line.value);
          return (
            <g key={line.value}>
              <line x1={P.left} y1={y} x2={W - P.right} y2={y} stroke={line.color ?? COLORS.amarelo} strokeDasharray="5 5" />
              {line.label ? (
                <text x={W - P.right - 6} y={y - 5} textAnchor="end" className="tick">
                  {line.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {data.map((item, index) => {
          const center = xForIndex(index, data.length);
          const y = scale(Math.max(item.y, 0));
          const h = Math.abs(scale(item.y) - zero);
          return (
            <g key={item.x}>
              <rect x={center - barW / 2} y={item.y >= 0 ? y : zero} width={barW} height={h} fill={item.color ?? COLORS.verde} />
              <text x={center} y={item.y >= 0 ? y - 8 : zero + h + 14} textAnchor="middle" className="tick">
                {item.label ?? item.y}
              </text>
              <text x={center} y={H - P.bottom + 18} textAnchor="middle" className="tick">
                {item.x}
              </text>
            </g>
          );
        })}
        <YAxis maxY={maxY} minY={minY} yLabel={yLabel} />
      </svg>
    </div>
  );
}

export function HorizontalBarChart({
  title,
  data,
  color,
  reference,
  referenceLabel,
}: {
  title: string;
  data: HorizontalPoint[];
  color: string;
  reference?: number;
  referenceLabel?: string;
}) {
  const rowH = 30;
  const height = Math.max(350, data.length * rowH + 82);
  const maxX = Math.max(55, ...data.map((item) => item.x + 10), reference ?? 0);
  const left = 300;
  const right = 48;
  const width = 920;
  const xScale = (value: number) => left + (value / maxX) * (width - left - right);

  return (
    <div className="chart-panel">
      <h3 className="chart-title">{title}</h3>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {reference !== undefined ? (
          <g>
            <line x1={xScale(reference)} y1="30" x2={xScale(reference)} y2={height - 40} stroke="#777" strokeDasharray="5 5" />
            <text x={xScale(reference) + 6} y="24" className="tick">
              {referenceLabel}
            </text>
          </g>
        ) : null}
        {data.map((item, index) => {
          const y = 45 + index * rowH;
          return (
            <g key={item.y}>
              <text x={left - 10} y={y + 14} textAnchor="end" className="tick">
                {item.y}
              </text>
              <rect x={left} y={y} width={xScale(item.x) - left} height="20" fill={color} />
              <text x={xScale(item.x) + 6} y={y + 14} className="tick">
                {item.label ?? `${item.x}%`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Axes({ xValues, maxY, xLabel, yLabel }: { xValues: (string | number)[]; maxY: number; xLabel?: string; yLabel?: string }) {
  return (
    <>
      <YAxis maxY={maxY} yLabel={yLabel} />
      <line x1={P.left} y1={H - P.bottom} x2={W - P.right} y2={H - P.bottom} stroke="#333" />
      {xValues.map((value, index) => (
        <text key={value} x={xForIndex(index, xValues.length)} y={H - P.bottom + 18} textAnchor="middle" className="tick">
          {value}
        </text>
      ))}
      {xLabel ? (
        <text x={(W + P.left - P.right) / 2} y={H - 10} textAnchor="middle" className="axis-label">
          {xLabel}
        </text>
      ) : null}
    </>
  );
}

function YAxis({ maxY, minY = 0, yLabel }: { maxY: number; minY?: number; yLabel?: string }) {
  const ticks = 5;
  return (
    <>
      <line x1={P.left} y1={P.top} x2={P.left} y2={H - P.bottom} stroke="#333" />
      {Array.from({ length: ticks + 1 }, (_, index) => {
        const value = minY + ((maxY - minY) / ticks) * index;
        const y = P.top + ((maxY - value) / (maxY - minY || 1)) * (H - P.top - P.bottom);
        return (
          <g key={index}>
            <line x1={P.left - 4} y1={y} x2={P.left} y2={y} stroke="#333" />
            <text x={P.left - 8} y={y + 4} textAnchor="end" className="tick">
              {Math.round(value)}
            </text>
          </g>
        );
      })}
      {yLabel ? (
        <text x="16" y={(H - P.bottom + P.top) / 2} textAnchor="middle" className="axis-label" transform={`rotate(-90 16 ${(H - P.bottom + P.top) / 2})`}>
          {yLabel}
        </text>
      ) : null}
    </>
  );
}

function Grid({ maxY }: { maxY: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => {
        const y = P.top + (index / 5) * (H - P.top - P.bottom);
        return <line key={index} x1={P.left} y1={y} x2={W - P.right} y2={y} stroke="#eee" />;
      })}
      <YAxis maxY={maxY} />
    </>
  );
}

function ReferenceLine({ value, maxY, label }: { value: number; maxY: number; label?: string }) {
  const y = yForValue(value, maxY);
  return (
    <g>
      <line x1={P.left} y1={y} x2={W - P.right} y2={y} stroke="#777" strokeDasharray="5 5" />
      {label ? (
        <text x={W - P.right - 6} y={y - 6} textAnchor="end" className="tick">
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((item) => (
        <span key={item.label}>
          <i className="swatch" style={{ "--color": item.color } as React.CSSProperties} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function xForIndex(index: number, total: number) {
  if (total <= 1) return (W + P.left - P.right) / 2;
  return P.left + (index / (total - 1)) * (W - P.left - P.right);
}

function yForValue(value: number, maxY: number) {
  return P.top + (1 - value / maxY) * (H - P.top - P.bottom);
}
