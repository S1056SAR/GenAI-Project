import type React from "react"
import type { Metadata } from "next"
import { DM_Sans, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "EduSynth - AI-Powered Learning Platform",
  description: "Experience the future of education with EduSynth. AI tutoring, smart exams, and immersive learning.",
  generator: "v0.app",
}

export const viewport = {
  themeColor: "#0f0c29",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
          {children}
          <Toaster />
        </GoogleOAuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
