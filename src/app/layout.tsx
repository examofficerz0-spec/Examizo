import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { GlobalHeader } from '@/components/layout/GlobalHeader';
import { HeaderProvider } from '@/context/HeaderContext';
import { AuthWatcher } from '@/components/common/AuthWatcher';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export const metadata: Metadata = {
  title: 'Examizo - Competitive Exam Preparation Portal',
  description: 'Student application for topic-wise practice sets, full-length mock tests, progress tracking, and course leaderboards.',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Examizo',
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.cloudflare.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Examizo" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script src="https://accounts.google.com/gsi/client" async defer id="google-gsi-script"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');localStorage.setItem('exammaster_theme','light');localStorage.setItem('exammaster_theme_preference','light');}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen min-h-[100dvh] font-sans antialiased">
        <HeaderProvider>
          <AuthWatcher />
          <GlobalHeader />
          {children}
          <MobileBottomNav />
        </HeaderProvider>
      </body>
    </html>
  );
}
