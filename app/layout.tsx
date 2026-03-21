import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Contact Enrichment Agent",
  description: "Agentic B2B sales intelligence demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}