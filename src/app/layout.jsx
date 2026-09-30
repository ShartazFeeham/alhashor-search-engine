import '../index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavBar from '../Navbar/Navbar';
import BackToTop from '../Helpers/BackToTop';

export const metadata = {
  title: 'BoiKotha - হাদীস সম্ভার',
  description:
    'হাদীস খুঁজুন: বুখারি, মুসলিম, তিরমিজি, আবু দাউদ, ইবনে মাজাহ ও নাসাঈ শরীফের হাদীস বাংলায় সার্চ, বিষয়ভিত্তিক ও বই অনুযায়ী পড়ুন।',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/logo192.png' },
};

export const viewport = { themeColor: '#000000' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>
        <NavBar />
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
