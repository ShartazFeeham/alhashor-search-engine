// A chip: a toggle button when `pressed` is given (a filter), a plain button when it is not. `dot` is an optional colour (a book's) shown before the label.
export default function Chip({ pressed, dot, children, ...props }) {
  return (
    <button type="button" className="ui-chip" aria-pressed={pressed} {...props}>
      {dot && <span className="ui-chip-dot" style={{ background: dot }} aria-hidden="true" />}
      {children}
    </button>
  );
}
