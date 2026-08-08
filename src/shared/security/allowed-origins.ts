/**
 * Server-only Origin / Referer allowlist.
 *
 * Keep this module out of client components. ALLOWED_ORIGINS is a server
 * runtime setting and must not be evaluated in the browser bundle.
 */
import 'server-only';
import { networkInterfaces } from 'node:os';

const env = process.env.ALLOWED_ORIGINS;

if (!env && process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] ALLOWED_ORIGINS environment variable is not configured. ' +
      'Production must set it to enable Origin allowlist validation.\n' +
      'Example: ALLOWED_ORIGINS=https://example.com,https://www.example.com',
  );
  process.exit(1);
}

const origins = env
  ? env.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:2333', 'http://localhost:3000'];

if (!env) {
  try {
    for (const addresses of Object.values(networkInterfaces())) {
      if (!addresses) continue;
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal) {
          origins.push(`http://${address.address}:2333`);
        }
      }
    }
  } catch {
    // Keep local development defaults if interface discovery fails.
  }
}

export const ALLOWED_ORIGINS = origins;
