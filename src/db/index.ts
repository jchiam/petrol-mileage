import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Placeholder keeps neon() from throwing at module init when DATABASE_URL is
// absent (e.g. during `next build`). Queries will fail at runtime if the real
// URL isn't set — which is the correct place for that error.
const sql = neon(
  process.env.DATABASE_URL ??
    'postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder',
);

export const db = drizzle(sql, { schema });
