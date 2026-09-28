import type { Metadata } from "next";
import { Geist, Jost } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const display = Jost({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"] });

const isTestSite = process.env.SITE_MODE === "preprod";

export const metadata: Metadata = {
  title: "Namma Angadi",
  description: "Online shops for local businesses",
  ...(isTestSite && { robots: { index: false, follow: false } }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${display.variable}`}>
      <body>
        {isTestSite && <div className="test-site-banner">Test site · no real payments, orders are not delivered</div>}
        {children}
      </body>
    </html>
  );
}
