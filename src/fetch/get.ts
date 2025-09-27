import {
  FLARESOLVERR_URL,
  PROXY_PASSWORD,
  PROXY_URL,
  PROXY_USERNAME,
} from "../env.ts";

const HEADERS = { "Content-Type": "application/json" };

/**
 * Fetch page using FlareSolverr
 *
 * @param url URL of page
 * @param sessionId FlareSolverr session ID
 * @returns HTML of page
 */
export async function getPage(
  url: string,
  sessionId?: string,
): Promise<string> {
  // console.debug(`Fetching url ${url}`);

  const res = await fetch(FLARESOLVERR_URL!, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      cmd: "request.get",
      url,
      ...(sessionId && { session: sessionId }),
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.status !== "ok") {
    throw new Error(`Failed to fetch page: ${data.message}`);
  }

  if (data.solution.status !== 200) {
    throw new Error(`Failed to fetch page: ${data.solution.status}`);
  }

  const html = data.solution.response;

  return html;
}

/**
 * Create FlareSolverr session
 *
 * @returns session ID
 */
export async function createSession(): Promise<string> {
  const res = await fetch(FLARESOLVERR_URL!, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      cmd: "sessions.create",
      ...(PROXY_URL && {
        proxy: {
          url: PROXY_URL!,
          username: PROXY_USERNAME!,
          password: PROXY_PASSWORD!,
        },
      }),
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP error: ${res.statusText}`);
  }

  const data = await res.json();

  if (data.status !== "ok") {
    throw new Error(`Failed to create session: ${data.message}`);
  }

  const sessionId = data.session;

  return sessionId;
}

/**
 * Destroy FlareSolverr session
 *
 * @param sessionId session ID
 */
export async function destroySession(sessionId: string): Promise<void> {
  const res = await fetch(FLARESOLVERR_URL!, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      cmd: "sessions.destroy",
      session: sessionId,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP error: ${res.statusText}`);
  }

  const data = await res.json();

  if (data.status !== "ok") {
    throw new Error(`Failed to destroy session: ${data.message}`);
  }
}
