/**
 * FTP client for DriveHQ file downloads.
 *
 * Connects to ftp.drivehq.com, lists directories, and downloads
 * the latest file (highest numbered filename) as a Buffer.
 * Includes retry logic with exponential backoff.
 */

import { Client } from "basic-ftp";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

interface FTPConfig {
  host: string;
  user: string;
  password: string;
}

function getFTPConfig(): FTPConfig {
  const host = process.env.DRIVEHQ_FTP_HOST;
  const user = process.env.DRIVEHQ_FTP_USER;
  const password = process.env.DRIVEHQ_FTP_PASS;

  if (!host || !user || !password) {
    throw new Error(
      "DriveHQ FTP not configured. Set DRIVEHQ_FTP_HOST, DRIVEHQ_FTP_USER, DRIVEHQ_FTP_PASS"
    );
  }

  return { host, user, password };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an FTP operation with retry logic.
 * Creates a fresh connection per attempt and closes it afterwards.
 */
async function withFTPRetry<T>(
  operation: (client: Client) => Promise<T>
): Promise<T> {
  const config = getFTPConfig();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const client = new Client();
    try {
      await client.access({
        host: config.host,
        user: config.user,
        password: config.password,
        secure: false,
      });
      const result = await operation(client);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(
        `FTP attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`
      );
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    } finally {
      client.close();
    }
  }

  throw new Error(
    `FTP operation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Find the latest file in a DriveHQ directory.
 * Files are numbered sequentially (e.g., 224531.xlsx).
 * Returns the filename with the highest number, or null if directory is empty.
 */
export async function getLatestFileName(
  directoryPath: string
): Promise<string | null> {
  return withFTPRetry(async (client) => {
    const listing = await client.list(directoryPath);

    // Filter to .xlsx files only
    const xlsxFiles = listing.filter(
      (f) => f.type !== 2 && f.name.endsWith(".xlsx")
    );

    if (xlsxFiles.length === 0) return null;

    // Sort by numeric filename (highest = latest)
    xlsxFiles.sort((a, b) => {
      const numA = parseInt(a.name.replace(".xlsx", ""), 10) || 0;
      const numB = parseInt(b.name.replace(".xlsx", ""), 10) || 0;
      return numB - numA;
    });

    return xlsxFiles[0].name;
  });
}

/**
 * Download a file from DriveHQ to a Buffer (in-memory).
 * The largest file is ~3MB so memory is not a concern.
 */
export async function downloadFile(filePath: string): Promise<Buffer> {
  return withFTPRetry(async (client) => {
    const chunks: Buffer[] = [];
    const writable = new (await import("stream")).Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    await client.downloadTo(writable, filePath);
    return Buffer.concat(chunks);
  });
}

/**
 * Convenience: get the latest file from a directory and download it.
 * Returns { fileName, data } or null if directory is empty.
 */
export async function downloadLatestFile(
  directoryPath: string
): Promise<{ fileName: string; data: Buffer } | null> {
  const fileName = await getLatestFileName(directoryPath);
  if (!fileName) return null;

  const fullPath = `${directoryPath}${fileName}`;
  const data = await downloadFile(fullPath);
  return { fileName, data };
}
