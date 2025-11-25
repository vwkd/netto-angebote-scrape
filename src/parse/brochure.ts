import type { Page } from "patchright";

const ANCHOR_SELECTOR = "body div#publication div#main_menu a#downloadAsPdf";

/**
 * Parse brochure page
 *
 * @param page page
 * @returns URL of brochure PDF
 */
export async function parseBrochurePage(page: Page): Promise<string> {
  // console.debug("Parsing brochure page");

  const anchorElement = page.locator(ANCHOR_SELECTOR).first();

  if (!await anchorElement.count()) {
    throw new Error("No anchor element found");
  }

  const url = await anchorElement.getAttribute("href");

  if (!url) {
    throw new Error("No URL found");
  }

  return url;
}
