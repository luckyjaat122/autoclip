import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoClip AI — Turn Long YouTube Videos Into Viral Shorts Automatically",
  description:
    "AutoClip detects the most viral moments, creates engaging short clips, adds captions, and prepares them for publishing across Reels, Shorts & TikTok.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%237c3aed'/><text x='50' y='72' font-size='64' font-family='Arial' font-weight='bold' fill='white' text-anchor='middle'>A</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body className="bg-white text-slate-900 font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
