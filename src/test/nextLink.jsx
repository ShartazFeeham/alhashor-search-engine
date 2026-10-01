import { useRouter } from 'next/navigation';

// Stand-in for next/link: a plain anchor that navigates through the test router.
export default function Link({ href, children, onClick, scroll, prefetch, ...rest }) {
  const router = useRouter();
  return (
    <a
      href={href}
      data-scroll={scroll === false ? 'false' : undefined}
      data-prefetch={prefetch === false ? 'false' : undefined}
      {...rest}
      onClick={(event) => {
        if (onClick) onClick(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        router.push(href);
      }}
    >
      {children}
    </a>
  );
}
