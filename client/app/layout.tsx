import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "FinaPilot - Your AI Financial Copilot",
  description:
    "Auto-generate your financial model. Build P&L, cashflow, and runway in minutes with AI-powered forecasting, Monte Carlo simulations, and investor-ready reports.",
  keywords:
    "financial modeling, AI CFO, startup finance, FP&A software, Monte Carlo forecasting, financial planning, cashflow management",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "FinaPilot - Your AI-CFO for Smarter Decisions",
    description:
      "Build complete financial models in minutes. AI-powered forecasting, scenario planning, and investor-ready reports.",
    type: "website",
    images: ["/icon.svg"],
  },
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
