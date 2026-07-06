import type { Metadata } from "next";
import { Space_Grotesk, Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const instrumentSerif = Instrument_Serif({ weight: "400", style: "italic", subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Siber — Where communities come alive",
  description: "A collaborative ecosystem hub architecture.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${spaceGrotesk.className} ${bricolage.variable} ${instrumentSerif.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}