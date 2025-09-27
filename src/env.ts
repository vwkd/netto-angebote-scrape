const FLARESOLVERR_URL = Deno.env.get("FLARESOLVERR_URL");

if (!FLARESOLVERR_URL) {
  throw new Error("FLARESOLVERR_URL environment variable is not set");
}

const PROXY_URL = Deno.env.get("PROXY_URL");
const PROXY_USERNAME = Deno.env.get("PROXY_USERNAME");
const PROXY_PASSWORD = Deno.env.get("PROXY_PASSWORD");

if (PROXY_URL && !PROXY_USERNAME && !PROXY_PASSWORD) {
  throw new Error(
    "PROXY_USERNAME and PROXY_PASSWORD environment variables are not set",
  );
} else if (!PROXY_URL && PROXY_USERNAME && !PROXY_PASSWORD) {
  throw new Error(
    "PROXY_URL and PROXY_PASSWORD environment variables are not set",
  );
} else if (!PROXY_URL && !PROXY_USERNAME && PROXY_PASSWORD) {
  throw new Error(
    "PROXY_URL and PROXY_USERNAME environment variables are not set",
  );
} else if (PROXY_URL && PROXY_USERNAME && !PROXY_PASSWORD) {
  throw new Error(
    "PROXY_PASSWORD environment variable is not set",
  );
} else if (PROXY_URL && !PROXY_USERNAME && PROXY_PASSWORD) {
  throw new Error(
    "PROXY_USERNAME environment variable is not set",
  );
} else if (!PROXY_URL && PROXY_USERNAME && PROXY_PASSWORD) {
  throw new Error(
    "PROXY_URL environment variable is not set",
  );
}

export { FLARESOLVERR_URL, PROXY_PASSWORD, PROXY_URL, PROXY_USERNAME };
