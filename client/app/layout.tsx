import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { CookieManager } from "@/components/security/cookie-manager"
import { CookieAwareAnalytics } from "@/components/security/cookie-aware-analytics"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  metadataBase: new URL("https://app.finapilot.com"),
  title: "FinaPilot Portal | Agentic AI Finance OS",
  description:
    "The operational interface for FinaPilot. Access your AI financial copilot, run Monte Carlo simulations, and manage board-grade reporting snapshots.",
  keywords:
    "financial modeling portal, AI CFO login, FP&A dashboard, Monte Carlo simulation app, SaaS finance operating system",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "FinaPilot Portal | Agentic AI Finance OS",
    description:
      "Operational dashboard for automated financial modeling, forecasting, and audit-grade reporting.",
    type: "website",
    url: "https://app.finapilot.com",
    siteName: "FinaPilot",
    images: [
      {
        url: "/icon.svg",
        width: 1200,
        height: 630,
        alt: "FinaPilot AI CFO",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('Loading chunk')) {
              window.location.reload();
            }
          }, true);
        `}} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="font-sans antialiased">
            {children}
            <CookieManager />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
