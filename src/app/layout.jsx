// All stylesheets are global and load in this order, exactly as the old single bundle did.
// (Pages relied on each other's rules, e.g. Loading.css's .container, so the order is kept.)
import '../index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import '../Helpers/HadisView.css';
import '../Helpers/Loading.css';
import '../Helpers/NextPrev.css';
import '../Search/Search.css';
import '../Search/suggestions.css';
import '../Books/Book.css';
import '../Topics/HadisIndex.css';
import '../Topics/Topics.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/ui.css';
import '../styles/home.css';
import { uiFont, readFont, latinFont } from '../fonts';
import TopNav from '../shell/TopNav';
import TabBar from '../shell/TabBar';
import Footer from '../shell/Footer';
import { ToastProvider } from '../ui/Toast';
import BackToTop from '../Helpers/BackToTop';
import { SettingsProvider } from '../settings/SettingsProvider';
import { themeScript } from '../settings/themeScript';

export const metadata = {
  description:
    'হাদীস খুঁজুন: বুখারি, মুসলিম, তিরমিজি, আবু দাউদ, ইবনে মাজাহ ও নাসাঈ শরীফের হাদীস বাংলায় সার্চ, বিষয়ভিত্তিক ও বই অনুযায়ী পড়ুন।',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/logo192.png' },
};

export const viewport = { themeColor: '#000000' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={`${uiFont.variable} ${readFont.variable} ${latinFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SettingsProvider>
          <ToastProvider>
            <TopNav />
            {children}
            <Footer />
            <TabBar />
            <BackToTop />
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
