// A small static progress ring: a faint full track and an arc for the part read, from the top,
// clockwise, with rounded ends. Below 33% red, 33% to below 66% yellow, 66% and more green; at 100%
// a green disc with a tick. At 0% only the (red) track is drawn.
const SIZE = 20;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const bandOf = (percent) => (percent >= 66 ? 'green' : percent >= 33 ? 'yellow' : 'red');

export default function ProgressRing({ percent, label }) {
  const band = bandOf(percent);
  const full = percent >= 100;
  const middle = SIZE / 2;
  return (
    <svg className="plan-ring" data-band={band} data-full={full ? 'true' : undefined} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      {full ? (
        <>
          <circle data-testid="ring-disc" cx={middle} cy={middle} r={SIZE / 2} fill="var(--progress-green)" />
          <path data-testid="ring-tick" d="M5.6 10.4 8.7 13.5 14.4 7.3" fill="none" stroke="var(--surface)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle data-testid="ring-track" cx={middle} cy={middle} r={RADIUS} fill="none" stroke={`var(--progress-${band}-track)`} strokeWidth={STROKE} />
          {percent > 0 && (
            <circle
              data-testid="ring-arc"
              cx={middle}
              cy={middle}
              r={RADIUS}
              fill="none"
              stroke={`var(--progress-${band})`}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${(CIRCUMFERENCE * percent) / 100} ${CIRCUMFERENCE}`}
              transform={`rotate(-90 ${middle} ${middle})`}
            />
          )}
        </>
      )}
    </svg>
  );
}
