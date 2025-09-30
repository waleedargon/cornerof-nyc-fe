import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UserLayout } from "@/components/layout/user-layout";

export const metadata: Metadata = {
  title: 'CORNER OF',
  description: 'Meet new groups, find your vibe.',
  keywords: 'groups, meetup, social, friends, hangout',
  authors: [{ name: 'CORNER OF Team' }],
  creator: 'CORNER OF',
  publisher: 'CORNER OF',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://cornerof.app'), // Replace with your actual domain
  openGraph: {
    title: 'CORNER OF - Meet new groups, find your vibe',
    description: 'Connect your crew with other groups for spontaneous meetups.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CORNER OF',
    description: 'Meet new groups, find your vibe.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add verification codes when available
    // google: 'verification-code',
    // yandex: 'verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Preload critical font */}
        <link
          rel="preload"
          href="/fonts/BLOCKSTE.TTF"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//www.google.com" />
        {/* reCAPTCHA for Firebase Phone Authentication */}
        <script src="https://www.google.com/recaptcha/enterprise.js?render=6Lc_StkrAAAAAF0i5eRw0IWC_cbZF9rxluu4gQio" async defer></script>
        {/* Optimize viewport for mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
        {/* Prevent FOUC */}
        <style>{`
          html { visibility: hidden; opacity: 0; }
          html.hydrated { visibility: visible; opacity: 1; transition: opacity 0.1s; }
        `}</style>
      </head>
      <body className="h-full antialiased">
        <div id="root" className="h-full">
          <UserLayout>
            {children}
          </UserLayout>
        </div>
        <Toaster />
        {/* Hydration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('hydrated');`,
          }}
        />
      </body>
    </html>
  );
}
