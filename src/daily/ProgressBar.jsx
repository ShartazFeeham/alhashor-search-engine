// A thin bar in the accent colour. `value` is a whole number from 0 to 100.
export default function ProgressBar({ label, value }) {
  return (
    <div className="prog" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}
