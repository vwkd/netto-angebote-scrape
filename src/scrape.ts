import { shuffle } from "@std/random";
import { createSession, destroySession, getPage } from "./fetch/get.ts";
import { parseOfferPage } from "./parse/offer.ts";
import { parseBrochurePage } from "./parse/brochure.ts";
import { downloadFile } from "./fetch/download.ts";
import type { Options } from "./types.ts";

const STORE_ID_MIN = 1000;
const STORE_ID_MAX = 9999;
const OFFERS_URL =
  "https://www.netto-online.de/ueber-netto/Online-Prospekte.chtm";

const formatter = new Intl.NumberFormat("default", { style: "percent" });

/**
 * Scrape local offers for Netto stores
 *
 * - fetch offer page from Netto website, parse URLs of brochures, fetch brochure pages, download files to output directory
 * - note: loop over store IDs from 1000 until 9999, since doesn't know if new stores got added
 * - note: offer page returns general offer page for non-existent store!
 * - use FlareSolverr to bypass Cloudflare
 * - note: use individual sessions otherwise silently gets page for previous store due to cookies
 *
 * @param options Options
 */
export async function scrape(options: Options) {
  const { dir, random } = options;

  console.info(`Scraping local offers for Netto stores...`);

  const generalPageHtml = await getPage(OFFERS_URL);
  const generalBrochures = parseOfferPage(generalPageHtml).brochures;

  await Deno.mkdir(dir, { recursive: true });

  // integer interval [STORE_ID_MIN, STORE_ID_MAX]
  let idsToCheck = Array.from(
    { length: (STORE_ID_MAX - STORE_ID_MIN + 1) },
    (_, i) => STORE_ID_MIN + i,
  );

  if (random) {
    idsToCheck = shuffle(idsToCheck);
  }

  for (const [i, id] of idsToCheck.entries()) {
    const url = new URL(OFFERS_URL);
    url.searchParams.set("stores_id", String(id));

    const sessionId = await createSession();
    const pageHtml = await getPage(url.toString(), sessionId);
    const pageBrochures = parseOfferPage(pageHtml);

    // skip non-existing stores
    if (!pageBrochures.address) {
      console.debug(
        `Skipping non-existing store ID ${id} of ${
          i + 1
        }/${idsToCheck.length} (${
          formatter.format((i + 1) / idsToCheck.length)
        })`,
      );

      await destroySession(sessionId);

      continue;
    }

    console.debug(
      `Scraping store ID ${id} of ${i + 1}/${idsToCheck.length} (${
        formatter.format((i + 1) / idsToCheck.length)
      })`,
    );

    const brochures = pageBrochures.brochures
      .filter((b) => !generalBrochures.some((gb) => gb.id === b.id));

    for (const brochure of brochures) {
      console.debug(`Downloading brochure '${brochure.id}'`);

      const pageHtml = await getPage(brochure.url, sessionId);
      const downloadUrl = parseBrochurePage(pageHtml);

      await downloadFile(downloadUrl, dir);
    }

    await destroySession(sessionId);
  }
}
