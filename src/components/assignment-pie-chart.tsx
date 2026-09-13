const SIZE = 96;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AssignmentPieChart({ assigned, total }: { assigned: number; total: number }) {
  const safeTotal = Math.max(total, 0);
  const fraction = safeTotal > 0 ? Math.min(assigned / safeTotal, 1) : 0;
  const dash = fraction * CIRCUMFERENCE;
  const label = `${assigned} מתוך ${safeTotal} קוטפים משובצים למשמרת`;

  return (
    <div className="assignment-pie" role="img" aria-label={label} title={label}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} />
        {fraction > 0 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </svg>
      <span className="assignment-pie-label" aria-hidden="true" dir="ltr">{assigned}/{safeTotal}</span>
    </div>
  );
}
