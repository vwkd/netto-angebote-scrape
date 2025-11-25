import type { Page } from "patchright";
import type { Brochure, Brochures } from "../types.ts";

const BROCHURE_SELECTOR =
  "main#main > section.sub-shop div.prospekt-teaser-container > div.prospekt-teaser-item";
const ANCHOR_SELECTOR =
  "div.prospekt-teaser-item-content div.prospekt-teaser-item-cta > a";
const ADDRESS_SELECTOR =
  "main#main > section.sub-shop section.your-store div.your-store-address > div.your-store__info__content > div.your-store__info__address";

/**
 * Parse offer page of store from Netto website
 *
 * @param page page
 * @returns brochures
 */
export async function parseOfferPage(page: Page): Promise<Brochures> {
  // console.debug("Parsing offer page");

  const brochureElements = await page.locator(BROCHURE_SELECTOR).all();

  const brochures: Brochure[] = [];

  for (const brochureElement of brochureElements) {
    const anchorElement = brochureElement.locator(ANCHOR_SELECTOR).first();

    if (!await anchorElement.count()) {
      throw new Error("No anchor element found");
    }

    const id = await anchorElement.getAttribute("id");

    if (!id) {
      throw new Error("No ID found");
    }

    const url = await anchorElement.getAttribute("href");

    // skip empty placeholder brochures
    if (!url) {
      continue;
    }

    brochures.push({
      id,
      url,
    });
  }

  const addressElement = page.locator(ADDRESS_SELECTOR).first();

  if (!await addressElement.count()) {
    return {
      brochures,
    };
  }

  const addressStr = await addressElement.textContent();

  if (!addressStr) {
    throw new Error("No address text content found");
  }

  const address = parseAddress(addressStr);

  return {
    address,
    brochures,
  };
}

/**
 * Parse address of store
 *
 * - only clean it up for now
 *
 * @param address address string
 * @returns address string
 */
function parseAddress(address: string): string {
  return address
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}
