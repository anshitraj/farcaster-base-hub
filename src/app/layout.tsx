import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "../index.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import MiniAppSDK from "@/components/MiniAppSDK";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mini App Store - Discover Farcaster & Base Mini Apps",
  description: "Explore, submit, and earn developer badges in the ultimate hub for decentralized mini applications.",
  icons: {
    icon: "/image.ico",
    shortcut: "/image.ico",
    apple: "/image.ico",
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: "https://minicast.store/og-image.png",
      button: {
        title: "Open Mini Cast Store",
        action: {
          type: "launch_frame",
          name: "Mini Cast Store",
          url: "https://minicast.store"
        }
      }
    })
  },
};

// Allow static generation where possible, but keep dynamic for auth-dependent routes
export const dynamic = 'auto';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Custom Favicon */}
        <link rel="icon" href="/image.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/image.ico" type="image/x-icon" />
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}

        {/* Plausible Analytics */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className={inter.className}>
        <MiniAppSDK />
        <ErrorBoundary>
          <main className="min-h-screen pb-20 lg:pb-0">
            {children}
          </main>
          <Footer />
          {/* Mobile Bottom Navigation - Show on all pages */}
          <BottomNav />
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
