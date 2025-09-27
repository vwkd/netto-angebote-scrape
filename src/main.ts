import { Command } from "@cliffy/command";
import { scrape } from "./scrape.ts";

await new Command()
  .name("netto-angebote-scrape")
  .version("0.0.1")
  .description("Scrape local offers for Netto stores")
  .option("-d, --dir <path:file>", "Output directory", { required: true })
  .action(scrape)
  .parse(Deno.args);
