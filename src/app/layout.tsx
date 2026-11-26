import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import "./themes.css";
const sans = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
});
const display = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
});
const comic = localFont({
  src: "../../node_modules/@fontsource/comic-neue/files/comic-neue-latin-400-normal.woff2",
  variable: "--font-comic-fallback",
  display: "swap",
  preload: false,
});
const themeInit = `try{var t=localStorage.getItem('pattern-lab-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}`;
export const metadata: Metadata = {
  title: {
    default: "Pattern Lab — Learn the pattern. Solve the problem.",
    template: "%s · Pattern Lab",
  },
  description:
    "A calmer way to learn data structures and algorithms. Practice patterns, write code, and build a notebook of things that click.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f9",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${comic.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ThemeProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
