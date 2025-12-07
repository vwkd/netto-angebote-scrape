import { Command, ValidationError } from "@cliffy/command";
import { OFFERS, scrape } from "./scrape.ts";
import type { Offer } from "./types.ts";
import "@total-typescript/ts-reset/array-includes";

const offersAll = Object.keys(OFFERS) as Offer[];

await new Command()
  .name("netto-angebote-scrape")
  .version("0.0.1")
  .description("Scrape local offers for Netto stores")
  .option("-d, --dir <path:file>", "Output directory", { required: true })
  .option("-l, --likely", "Only likely stores")
  .option("-o, --offers <offers:string>", "Offer types", {
    collect: true,
    default: offersAll,
    value: (values: string | string[], agg: string[] = []) => {
      // default value, just pass on
      if (Array.isArray(values)) {
        return values;
      }

      if (!offersAll.includes(values)) {
        throw new ValidationError(
          `Offer must be one of '${offersAll.join("', '")}'`,
        );
      }

      return [...agg, values];
    },
  })
  .action(scrape)
  .parse(Deno.args);
