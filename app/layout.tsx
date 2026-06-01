import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { DevAuthBadge, MainNav, Footer } from "@/components/layout";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getSession } from "@/lib/auth/session";

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

export const metadata: Metadata = {
  title: "Devotional Transcripts",
  description: "Production-grade devotional lecture transcription platform",
  icons: "/favicon.ico",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession()

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider>
        <AuthProvider>
          <MainNav session={session} />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          {process.env.ENABLE_DEV_AUTH === "true" && <DevAuthBadge />}
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
