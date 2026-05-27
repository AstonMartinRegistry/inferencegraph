import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { MonitorProvider } from "@/components/MonitorProvider";
import "./globals.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "gpt oss 120b inference latency graph",
  description: "Live latency graph for gpt-oss-120b inference providers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistMono.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <MonitorProvider>{children}</MonitorProvider>
      </body>
    </html>
  );
}
