export default function Button({ variant = 'default', size, className = '', children, ...props }) {
  const classes = ['ui-btn', variant !== 'default' && variant, size, className].filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
