// Cloudflare D1 is the primary production database.
// MongoDB is decommissioned.

export async function dbConnect() {
  return { isMemoryMode: true, isD1: true, conn: null };
}
