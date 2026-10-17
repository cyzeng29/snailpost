import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Caveat, Fraunces } from "next/font/google";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "snailpost",
  description: "A day in my life, as a postcard.",
  icons: { icon: "/brand/snail-mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${atkinson.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppearanceProvider>{children}</AppearanceProvider>
      </body>
    </html>
  );
}
