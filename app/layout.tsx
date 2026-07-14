import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { MainNav, Footer } from "@/components/layout";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { AppInitializer } from "@/components/app-initializer";
import { getSession } from "@/lib/auth/session";
import { getBaseUrl } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = getBaseUrl()

  return {
    title: "Devotional Transcripts | Lecture Transcription & Community Collaboration",
    description: "A production-grade platform for transcribing, editing, and analyzing devotional lectures with community collaboration, full-text search, and AI-powered insights. Discover spiritual wisdom through carefully transcribed lectures.",
    keywords: [
      "devotional lectures",
      "transcription platform",
      "spiritual teachings",
      "Krishna consciousness",
      "lecture repository",
      "community collaboration",
      "transcript editing",
      "full-text search",
    ],
    icons: {
      icon: "/favicon.svg",
      apple: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: baseUrl,
      title: "Devotional Transcripts | Lecture Transcription Platform",
      description:
        "Community-powered platform for transcribing and sharing devotional lectures with AI-powered analysis and collaborative editing.",
      siteName: "Devotional Transcripts",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "Devotional Transcripts Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Devotional Transcripts | Lecture Transcription Platform",
      description:
        "Community-powered platform for transcribing and sharing devotional lectures with AI-powered analysis.",
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    alternates: {
      canonical: baseUrl,
    },
  };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession()

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Devotional Transcripts",
    "description": "A production-grade platform for transcribing, editing, and analyzing devotional lectures with community collaboration and AI-powered insights.",
    "url": "https://dts-liard.vercel.app",
    "applicationCategory": "ProductivityApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "150"
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider>
        <AuthProvider>
          <AppInitializer>
            <MainNav session={session} />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </AppInitializer>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
