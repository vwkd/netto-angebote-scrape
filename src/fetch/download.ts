import { parse } from "content-disposition";
import { join } from "@std/path";

/**
 * Download file
 *
 * @param url URL of file
 * @param directory path for directory for file
 */
export async function downloadFile(
  url: string,
  directory: string,
): Promise<void> {
  // console.debug(`Downloading file ${url}`);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Got error ${res.status} ${res.statusText}.`);
  }

  if (!res.body) {
    throw new Error("Got empty body.");
  }

  const dispositionHeader = res.headers.get("Content-Disposition");
  const disposition = parse(dispositionHeader);
  const filename = disposition.parameters.filename;

  if (!(disposition.type == "attachment" && filename)) {
    throw new Error("Unexpected Content-Disposition header.");
  }

  const filepath = join(directory, filename);
  const file = await Deno.create(filepath);

  await res.body.pipeTo(file.writable);
}
