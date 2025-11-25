import { partition } from "@std/collections";
import { shuffle } from "@std/random";
import { join } from "@std/path";
import { type Browser, chromium } from "patchright";
import { parseOfferPage } from "./parse/offer.ts";
import { parseBrochurePage } from "./parse/brochure.ts";
import { downloadFile } from "./fetch/download.ts";
import { range } from "./utils.ts";
import type { Options, Store } from "./types.ts";

const PARALLEL_JOBS = 3;
const STORE_ID_MIN = 1000;
const STORE_ID_MAX = 9999;
const OFFERS_URL =
  "https://www.netto-online.de/ueber-netto/Online-Prospekte.chtm";
const CACHED_STORES_FILENAME = "cached_stores.db";
const CACHED_STORES_PREFIX = ["netto-stores"];
const OFFERS_FILENAME = "offers.md";

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
 * - use headful Chrome to bypass anti-bot detection
 * - use headless instance for faster scraping, but needs to spoof user agent of headful instance
 * - note: use individual sessions otherwise silently gets page for previous store due to cookies
 *
 * @param options Options
 */
export async function scrape(options: Options) {
  const { dir, likely, offers, random } = options;

  console.info(`Scraping local offers for Netto stores...`);

  await Deno.mkdir(dir, { recursive: true });

  const offersFilepath = join(dir, OFFERS_FILENAME);
  await Deno.writeTextFile(offersFilepath, `# Offers\n`);

  const cachedStoresFilepath = join(dir, CACHED_STORES_FILENAME);
  using kv = await Deno.openKv(cachedStoresFilepath);
  const cachedStores =
    (await Array.fromAsync(kv.list<Store>({ prefix: CACHED_STORES_PREFIX })))
      .map((e) => e.value);

  const userAgent = await getUserAgent();

  const browsers = await Promise.all(
    Array.from({ length: PARALLEL_JOBS }, async () =>
      await chromium.launch({
        channel: "chrome",
        headless: true,
      })),
  );

  const context = await browsers[0].newContext({
    userAgent,
  });

  const page = await context.newPage();
  await page.goto(OFFERS_URL);
  const generalBrochures = (await parseOfferPage(page)).brochures;

  await context.close();

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

  const queue = idsToCheck.entries();

  async function doWork(browser: Browser) {
    for (const [i, id] of queue) {
      const url = new URL(OFFERS_URL);
      url.searchParams.set("stores_id", String(id));

      const context = await browser.newContext({
        userAgent,
      });

      const page = await context.newPage();
      await page.goto(url.toString());
      const pageBrochures = await parseOfferPage(page);

      const cachedStore = cachedStores.find((s) => s.id === id);
      if (!cachedStore || cachedStore.address !== pageBrochures.address) {
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

        await context.close();

        continue;
      }

      console.debug(
        `Scraping store ID ${id} of ${i + 1}/${idsToCheck.length} (${
          formatter.format((i + 1) / idsToCheck.length)
        })`,
      );

      const brochures = pageBrochures.brochures
        .filter((b) => !generalBrochures.some((gb) => gb.id === b.id));

      let didHeader = false;
      for (const brochure of brochures) {
        if (!Object.values(OFFERS).some((val) => brochure.id.match(val.re))) {
          console.warn(`Skipping unexpected brochure '${brochure.id}'`);
        }

        const offerSelected = offers.find((offer) =>
          brochure.id.match(OFFERS[offer].re)
        );

        if (!offerSelected) {
          console.debug(`Skipping unselected brochure '${brochure.id}'`);
          continue;
        }

        console.debug(`Downloading brochure '${brochure.id}'`);

        if (!didHeader) {
          await Deno.writeTextFile(
            offersFilepath,
            `\n\n## ${pageBrochures.address}\n`,
            {
              append: true,
            },
          );
          didHeader = true;
        }

        await Deno.writeTextFile(
          offersFilepath,
          `\n- [${offerSelected}](${brochure.url})\n`,
          {
            append: true,
          },
        );

        const page = await context.newPage();
        await page.goto(brochure.url);
        const downloadUrl = await parseBrochurePage(page);

        await downloadFile(downloadUrl, dir);
      }

      await context.close();
    }
  }

  await Promise.all(
    browsers.map((browser) => doWork(browser)),
  );

  await Promise.all(
    browsers.map(async (browser) => await browser.close()),
  );
}

/**
 * Get user agent of headful browser instance
 *
 * @returns User agent string
 */
async function getUserAgent(): Promise<string> {
  const inspectionApi = "https://mockhttp.org/user-agent";

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
  });

  const page = await browser.newPage();

  const res = await page.goto(inspectionApi);

  if (!res) {
    throw new Error(`Got no response`);
  }

  if (!res.ok) {
    throw new Error(`Got HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  await browser.close();

  const userAgent: string = data.userAgent;

  return userAgent;
}
