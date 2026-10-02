// Which top-level section a path belongs to. A hadis page belongs to Books.
export function activeSection(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/books') || pathname.startsWith('/hadis')) return 'books';
  if (pathname.startsWith('/topics')) return 'topics';
  if (pathname.startsWith('/daily')) return 'daily';
  if (pathname.startsWith('/compare')) return 'compare';
  return null;
}
