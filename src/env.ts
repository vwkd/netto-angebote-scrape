const FLARESOLVERR_URL = Deno.env.get("FLARESOLVERR_URL");

if (!FLARESOLVERR_URL) {
  throw new Error("FLARESOLVERR_URL environment variable is not set");
}

export { FLARESOLVERR_URL };
