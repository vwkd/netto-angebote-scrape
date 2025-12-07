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
  .option("-e, --end <end:integer>", "End ID", {
    default: 9999,
    value: (val) => {
      // todo: validate that is less than or equal to `start`
      if (val > 9999) {
        throw new ValidationError(
          `End ID must be less than or equal to 9999`,
        );
      }

      return val;
    },
  })
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
  .option("-s, --start <start:integer>", "Start ID", {
    default: 1000,
    value: (val) => {
      // todo: validate that is greater than or equal to `start`
      if (val < 1000) {
        throw new ValidationError(
          `Start ID must be greater than or equal to 1000`,
        );
      }

      return val;
    },
  })
  .action(scrape)
  .parse(Deno.args);
