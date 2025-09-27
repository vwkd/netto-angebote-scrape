import { DOMParser } from "@b-fuze/deno-dom";
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
 * @param pageHtml HTML of page
 * @returns brochures
 */
export function parseOfferPage(pageHtml: string): Brochures {
  // console.debug("Parsing offer page");

  const doc = new DOMParser().parseFromString(pageHtml, "text/html");

  const brochureElements = doc.querySelectorAll(BROCHURE_SELECTOR);

  const brochures: Brochure[] = [];

  for (const brochureElement of brochureElements) {
    const anchorElement = brochureElement.querySelector(ANCHOR_SELECTOR);

    if (!anchorElement) {
      throw new Error("No anchor element found");
    }

    const id = anchorElement.getAttribute("id");

    if (!id) {
      throw new Error("No ID found");
    }

    const url = anchorElement.getAttribute("href");

    // skip empty placeholder brochures
    if (!url) {
      continue;
    }

    brochures.push({
      id,
      url,
    });
  }

  const addressElement = doc.querySelector(ADDRESS_SELECTOR);

  if (!addressElement) {
    return {
      brochures,
    };
  }

  const address = parseAddress(addressElement.textContent);

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
