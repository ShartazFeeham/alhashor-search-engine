// All stylesheets are global and load in this order (a test pins it).
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/ui.css';
import '../styles/home.css';
import '../styles/hadis.css';
import '../styles/search.css';
import '../styles/books.css';
import '../styles/topics.css';
import '../styles/share.css';
import '../styles/daily.css';
import '../styles/related.css';
import '../styles/compare.css';
import { uiFont, readFont, latinFont } from '../fonts';
import TopNav from '../shell/TopNav';
import TabBar from '../shell/TabBar';
import Footer from '../shell/Footer';
import { ToastProvider } from '../ui/Toast';
import CompareBar from '../compare/CompareBar';
import { CompareProvider } from '../compare/CompareProvider';
import BackToTop from '../Helpers/BackToTop';
import { SettingsProvider } from '../settings/SettingsProvider';
import { themeScript } from '../settings/themeScript';

export const metadata = {
  description:
    'হাদীস খুঁজুন: বুখারি, মুসলিম, তিরমিজি, আবু দাউদ, ইবনে মাজাহ ও নাসাঈ শরীফের হাদীস বাংলায় সার্চ, বিষয়ভিত্তিক ও বই অনুযায়ী পড়ুন।',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/logo192.png' },
};

// The phone's browser bar follows the page colour (light page, dark page), not black.
export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f8f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1714' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={`${uiFont.variable} ${readFont.variable} ${latinFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">মূল অংশে যান</a>
        <SettingsProvider>
          <ToastProvider>
            <CompareProvider>
              <TopNav />
              {children}
              <Footer />
              <TabBar />
              <CompareBar />
              <BackToTop />
            </CompareProvider>
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
