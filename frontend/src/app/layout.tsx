import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RouteGuard } from "@/components/organisms/RouteGuard";
import { QueryProvider } from "@/context/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SecureBank GRC",
  description: "SecureBank Governance, Risk, and Compliance System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased text-primary bg-background`}>
        <QueryProvider>
          <RouteGuard>{children}</RouteGuard>
        </QueryProvider>
      </body>
    </html>
  );
}
