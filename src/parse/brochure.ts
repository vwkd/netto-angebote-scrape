import { DOMParser } from "@b-fuze/deno-dom";

const ANCHOR_SELECTOR = "body div#publication div#main_menu a#downloadAsPdf";

/**
 * Parse brochure page
 *
 * @param pageHtml HTML of page
 * @returns URL of brochure PDF
 */
export function parseBrochurePage(pageHtml: string): string {
  // console.debug("Parsing brochure page");

  const doc = new DOMParser().parseFromString(pageHtml, "text/html");

  const anchorElement = doc.querySelector(ANCHOR_SELECTOR);

  if (!anchorElement) {
    throw new Error("No anchor element found");
  }

  const url = anchorElement.getAttribute("href");

  if (!url) {
    throw new Error("No URL found");
  }

  return url;
}
