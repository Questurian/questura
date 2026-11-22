import { Cormorant_Garamond, DM_Sans, Geist_Mono, Roboto } from "next/font/google";

/*
 * Fonts used by the site chrome and content routes, but not by the /join
 * funnel.
 *
 * next/font preloads a family on every route whose module graph pulls it in,
 * so declaring these in the root layout put their woff2 files in front of
 * every page — including /join, which renders neither family and was pushing
 * its hero image down the queue behind them. Declared here, they are
 * preloaded only on the routes that mount this wrapper.
 */
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
// Moved from the root layout (2026-11-22): /join uses neither, and on the
// speed budget's phone their 62 kB held its hero photo past 2.5 s. Every
// route that draws them mounts this wrapper.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const editorialSerif = Cormorant_Garamond({
  variable: "--font-editorial-serif",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
// Roboto draws one thing, the Google sign-in button inside the sign-in
// modal. Preloading it put a font no first screen uses ahead of the page's
// photo and its real fonts, so it loads when that button is drawn instead.
const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
});

/*
 * display: contents keeps the variables inheriting to the whole subtree
 * without the wrapper becoming a flex item of the root layout's column —
 * the navbar, <main> and footer stay direct children of that flex context.
 */
export function SiteFonts({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${dmSans.variable} ${roboto.variable} ${geistMono.variable} ${editorialSerif.variable}`}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  );
}
