import { partition } from "@std/collections";
import { shuffle } from "@std/random";
import { join } from "@std/path";
import { createSession, destroySession, getPage } from "./fetch/get.ts";
import { parseOfferPage } from "./parse/offer.ts";
import { parseBrochurePage } from "./parse/brochure.ts";
import { downloadFile } from "./fetch/download.ts";
import { range } from "./utils.ts";
import type { Options, Store } from "./types.ts";

const STORE_ID_MIN = 1000;
const STORE_ID_MAX = 9999;
const OFFERS_URL =
  "https://www.netto-online.de/ueber-netto/Online-Prospekte.chtm";
const CACHED_STORES_FILENAME = "cached_stores.db";
const CACHED_STORES_PREFIX = ["netto-stores"];

/**
 * Offer types
 */
export const OFFERS = {
  /**
   * Filialangebote
   */
  "HZ": {
    checkStores: true,
    checkBlanks: false,
    re: /^filialangebote-KW\d+$/,
  },
  /**
   * Getränkemarkt
   */
  "GHZ": {
    checkStores: true,
    checkBlanks: false,
    re: /^getraenkemarkt$/,
  },
  /**
   * Sonderbeilagen
   */
  "Ko": {
    checkStores: true,
    checkBlanks: false,
    re: /^sonderbeilagen$/,
  },
  /**
   * Neueröffnung
   */
  "NE": {
    checkStores: false,
    checkBlanks: true,
    re: /^neueroeffnung $/,
  },
  /**
   * Wiedereröffnung
   */
  "WE": {
    checkStores: true,
    checkBlanks: true,
    re: /^wiedereroefnung $/,
  },
  /**
   * Verkaufsoffener Sonntag
   */
  "VOS": {
    checkStores: true,
    checkBlanks: false,
    re: /^verkaufsoffenersonntag$/,
  },
} as const;

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
  const { dir, likely, offers, random } = options;

  console.info(`Scraping local offers for Netto stores...`);

  await Deno.mkdir(dir, { recursive: true });

  const cachedStoresFilepath = join(dir, CACHED_STORES_FILENAME);
  using kv = await Deno.openKv(cachedStoresFilepath);
  const cachedStores =
    (await Array.fromAsync(kv.list<Store>({ prefix: CACHED_STORES_PREFIX })))
      .map((e) => e.value);

  const generalPageHtml = await getPage(OFFERS_URL);
  const generalBrochures = parseOfferPage(generalPageHtml).brochures;

  const allStoreIds = new Set(range(STORE_ID_MIN, STORE_ID_MAX));
  const cachedStoreIds = new Set(cachedStores.map((s) => s.id));
  const uncachedStoreIds = allStoreIds.difference(cachedStoreIds);

  const [knownStores, knownBlanks] = partition(
    cachedStores,
    (s) => !!s.address,
  );
  const knownStoreIds = knownStores.map((s) => s.id);
  const knownBlankIds = knownBlanks.map((s) => s.id);

  const checkStores = offers.some((offer) => OFFERS[offer].checkStores);
  const checkBlanks = offers.some((offer) => OFFERS[offer].checkBlanks);

  let idsToCheck: number[];

  if (likely && !(checkStores && checkBlanks)) {
    if (checkStores) {
      idsToCheck = [...knownStoreIds, ...uncachedStoreIds];
    } else if (checkBlanks) {
      idsToCheck = [...knownBlankIds, ...uncachedStoreIds];
    } else {
      throw new Error("Should be unreachable");
    }
  } else {
    idsToCheck = Array.from(allStoreIds);
  }

  if (random) {
    idsToCheck = shuffle(idsToCheck);
  }

  for (const [i, id] of idsToCheck.entries()) {
    const url = new URL(OFFERS_URL);
    url.searchParams.set("stores_id", String(id));

    const sessionId = await createSession();
    const pageHtml = await getPage(url.toString(), sessionId);
    const pageBrochures = parseOfferPage(pageHtml);

    if (!cachedStores.some((s) => s.id === id)) {
      console.debug(`Saving to cached stores`);

      const store: Store = {
        id,
        address: pageBrochures.address,
      };

      const key = [...CACHED_STORES_PREFIX, id];
      await kv.set(key, store);
    }

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
      if (!offers.some((offer) => brochure.id.match(OFFERS[offer].re))) {
        console.debug(`Skipping unselected brochure '${brochure.id}'`);
        continue;
      }

      console.debug(`Downloading brochure '${brochure.id}'`);

      const pageHtml = await getPage(brochure.url, sessionId);
      const downloadUrl = parseBrochurePage(pageHtml);

      await downloadFile(downloadUrl, dir);
    }

    await destroySession(sessionId);
  }
}
