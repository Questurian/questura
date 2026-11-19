import { Jost, Lato, Manrope, Raleway, Work_Sans } from "next/font/google";

import type { DestinationHeaderTextFont } from "../../../types";

/*
 * The thin sans-serifs the shared Destination Header style can pick from.
 * `preload: false`: each family is declared (a few hundred bytes of
 * @font-face) but the browser downloads only the one a header actually uses,
 * when it draws it. DM Sans comes from SiteFonts and the serif from the root
 * layout, so they are not declared again here.
 */
const jost = Jost({ subsets: ["latin"], preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400"], preload: false });
const raleway = Raleway({ subsets: ["latin"], preload: false });
const manrope = Manrope({ subsets: ["latin"], preload: false });
const workSans = Work_Sans({ subsets: ["latin"], preload: false });

/** Class that sets the description's (and the crumb's) font family. */
export const DESTINATION_HEADER_FONT_CLASS: Record<DestinationHeaderTextFont, string> = {
  jost: jost.className,
  lato: lato.className,
  raleway: raleway.className,
  manrope: manrope.className,
  dmsans: "font-[family-name:var(--font-dm-sans)]",
  worksans: workSans.className,
  serif: "font-editorial",
};
