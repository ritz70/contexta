import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono, Geist } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Contexta — Brand governance that adapts to the destination",
    template: "%s | Contexta",
  },
  description:
    "Brand Sovereign — the secure, adaptive brand governance ecosystem for Enterprise AI. One brand system, three enforcement modes chosen by channel risk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark", spaceGrotesk.variable, ibmPlexSans.variable, ibmPlexMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            },
          }}
        />
      </body>
    </html>
  );
}
