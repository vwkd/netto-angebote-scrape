import { runCommand } from "@vwkd/flaresolverr";
import { FLARESOLVERR_URL } from "../env.ts";

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

  const data = await runCommand(FLARESOLVERR_URL!, {
    cmd: "request.get",
    url,
    ...(sessionId && { session: sessionId }),
  });

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
  const data = await runCommand(FLARESOLVERR_URL!, { cmd: "sessions.create" });

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
  const data = await runCommand(FLARESOLVERR_URL!, {
    cmd: "sessions.destroy",
    session: sessionId,
  });

  if (data.status !== "ok") {
    throw new Error(`Failed to destroy session: ${data.message}`);
  }
}
