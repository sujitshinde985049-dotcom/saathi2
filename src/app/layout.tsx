import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAATHI by MAHACRED",
  description:
    "Multi-tenant cooperative credit society management platform with RBI/CIC compliant customer search and consent management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
