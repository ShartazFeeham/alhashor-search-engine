// A filter chip: a toggle button. `dot` is an optional colour (a book's) shown before the label.
export default function Chip({ pressed = false, dot, children, ...props }) {
  return (
    <button type="button" className="ui-chip" aria-pressed={pressed} {...props}>
      {dot && <span className="ui-chip-dot" style={{ background: dot }} aria-hidden="true" />}
      {children}
    </button>
  );
}
