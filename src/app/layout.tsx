import type { Metadata } from "next";
import {
  Geist_Mono,
  Jersey_10,
  Inter_Tight,
  Press_Start_2P,
  Silkscreen,
} from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// heavy tight sans; phone.css screens it through a round-dot mask
const dotFace = Inter_Tight({
  variable: "--font-dot",
  subsets: ["latin"],
  weight: ["800", "900"],
});

const jersey = Jersey_10({
  variable: "--font-jersey",
  subsets: ["latin"],
  weight: "400",
});

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "A Thought For You",
  description: "A random quote, delivered by text message.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${geistMono.variable} ${dotFace.variable} ${jersey.variable} ${silkscreen.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
