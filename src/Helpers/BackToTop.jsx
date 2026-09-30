'use client';

export default function BackToTop() {
  return (
    <div
      className="top"
      role="button"
      tabIndex={0}
      aria-label="Back to top"
      onClick={() => {
        document.documentElement.scrollTop = 0;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') document.documentElement.scrollTop = 0;
      }}
    >
      &#8673;
    </div>
  );
}
