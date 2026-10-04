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
import '../styles/homeNarrators.css';
import { uiFont, readFont, latinFont, digitFont } from '../fonts';
import TopNav from '../shell/TopNav';
import TabBar from '../shell/TabBar';
import { ToastProvider } from '../ui/Toast';
import BackToTop from '../Helpers/BackToTop';
import { SettingsProvider } from '../settings/SettingsProvider';
import { themeScript } from '../settings/themeScript';
import { SITE_URL } from '../lib/site';

export const metadata = {
  // Relative addresses in any page's metadata (images, canonical, feeds) resolve against this.
  metadataBase: new URL(SITE_URL),
  description:
    'হাদীস খুঁজুন: বুখারি, মুসলিম, তিরমিজি, আবু দাউদ, ইবনে মাজাহ ও নাসাঈ শরীফের হাদীস বাংলায় সার্চ, বিষয়ভিত্তিক ও বই অনুযায়ী পড়ুন।',
  manifest: '/manifest.json',
};

// The phone's browser bar follows the page colour, not black. Light is the default for everyone;
// the theme script and the settings code change the colour when a visitor picks another theme.
export const viewport = {
  themeColor: '#f2f8f6',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" data-theme="light" className={`${uiFont.variable} ${readFont.variable} ${latinFont.variable} ${digitFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">মূল অংশে যান</a>
        <SettingsProvider>
          <ToastProvider>
            <TopNav />
            {children}
            <TabBar />
            <BackToTop />
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
