import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const ibmPlex = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-ibm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panella | Premium Game Server Hosting",
  description: "Next-generation game server management panel powered by Clean Architecture and Go.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-primary/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
