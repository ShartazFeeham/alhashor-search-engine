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
import '../Navbar/Navbar.css';
import '../Books/Book.css';
import '../Topics/HadisIndex.css';
import '../Topics/Topics.css';
import '../Home/Home.css';
import '../styles/tokens.css';
import '../styles/base.css';
import { uiFont, readFont, latinFont } from '../fonts';
import NavBar from '../Navbar/Navbar';
import BackToTop from '../Helpers/BackToTop';

export const metadata = {
  description:
    'হাদীস খুঁজুন: বুখারি, মুসলিম, তিরমিজি, আবু দাউদ, ইবনে মাজাহ ও নাসাঈ শরীফের হাদীস বাংলায় সার্চ, বিষয়ভিত্তিক ও বই অনুযায়ী পড়ুন।',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/logo192.png' },
};

export const viewport = { themeColor: '#000000' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={`${uiFont.variable} ${readFont.variable} ${latinFont.variable}`}>
      <body>
        <NavBar />
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
