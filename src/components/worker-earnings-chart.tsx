const CHART_WIDTH = 600;
const CHART_HEIGHT = 160;
const PADDING = { top: 12, right: 10, bottom: 22, left: 10 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export type EarningsPoint = { day: number; total: number; hasShift: boolean };

function axisDays(minDay: number, maxDay: number): number[] {
  if (maxDay <= minDay) return [minDay];
  const days = new Set([minDay, maxDay]);
  const span = maxDay - minDay;
  const step = span > 20 ? 7 : span > 10 ? 5 : Math.ceil(span / 2);
  for (let day = minDay + step; day < maxDay; day += step) days.add(day);
  return Array.from(days).sort((a, b) => a - b);
}

export function WorkerEarningsChart({ points, scaleMax }: { points: EarningsPoint[]; scaleMax?: number }) {
  const minDay = points[0]?.day ?? 1;
  const maxDay = Math.max(points[points.length - 1]?.day ?? 1, minDay + 1);
  const maxTotal = Math.max(scaleMax ?? 0, ...points.map(p => p.total), 1);

  const x = (day: number) => PADDING.left + ((day - minDay) / (maxDay - minDay)) * INNER_WIDTH;
  const y = (total: number) => PADDING.top + INNER_HEIGHT - (total / maxTotal) * INNER_HEIGHT;

  const firstShiftIndex = points.findIndex(p => p.hasShift);
  const lastShiftIndex = points.length - 1 - [...points].reverse().findIndex(p => p.hasShift);
  const linePoints = firstShiftIndex === -1 ? [] : points.slice(firstShiftIndex, lastShiftIndex + 1);
  const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.day).toFixed(1)} ${y(p.total).toFixed(1)}`).join(" ");
  const shiftPoints = points.filter(p => p.hasShift);

  return (
    <div className="card earnings-chart-card">
      <div dir="ltr" className="earnings-chart">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="מגמת ההכנסות החודש, ללא ערכים מדויקים">
          {linePoints.length > 1 && (
            <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {shiftPoints.map(p => (
            <circle key={p.day} cx={x(p.day)} cy={y(p.total)} r={4} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
          ))}
          {axisDays(minDay, maxDay).map(day => (
            <text key={day} x={x(day)} y={CHART_HEIGHT - 4} textAnchor="middle" className="earnings-chart-axis-label">
              {day}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
