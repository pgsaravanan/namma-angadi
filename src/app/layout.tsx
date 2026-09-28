import type { Metadata } from "next";
import { Geist, Jost } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const display = Jost({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Namma Angadi",
  description: "Online shops for local businesses",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
