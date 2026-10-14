import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/client/components/layout/Header";
import { Footer } from "@/client/components/layout/Footer";
import { MobileBottomNav } from "@/client/components/layout/MobileBottomNav";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: "PaisaPilot — AI-Powered Personal Finance Intelligence",
  description:
    "Track expenses, import SBI & PhonePe bank statements, manage budgets, and understand spending trends with grounded, transparent AI intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}

