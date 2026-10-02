import localFont from 'next/font/local';

// Fonts are files in src/assets/fonts (SIL Open Font License), bundled with the app and served
// from this site, never loaded from an outside server.
//
// next/font preloads every file of a declaration or none, so only the interface font (every page
// shows it) is preloaded. The reading serif (about 1 MB) and the Latin font load the first time
// text uses them, with display swap. The Medium (500) face is not used: a 500 request shows the
// Regular face. The Medium file stays in src/assets/fonts (the licence and the tests list it).
export const uiFont = localFont({
  src: [
    { path: './assets/fonts/HindSiliguri-Regular.ttf', weight: '400' },
    { path: './assets/fonts/HindSiliguri-SemiBold.ttf', weight: '600' },
    { path: './assets/fonts/HindSiliguri-Bold.ttf', weight: '700' },
  ],
  variable: '--f-ui',
  display: 'swap',
});

export const readFont = localFont({
  src: './assets/fonts/NotoSerifBengali.ttf',
  variable: '--f-read',
  preload: false,
  display: 'swap',
});

export const latinFont = localFont({
  src: './assets/fonts/PlusJakartaSans.ttf',
  variable: '--f-lat',
  preload: false,
  display: 'swap',
});
