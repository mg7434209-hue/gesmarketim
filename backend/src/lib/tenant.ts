// Tenant resolver. Resolves the active tenant from process.env.TENANT_SLUG
// (default "gesmarketim") against the tenants table and caches the id for the
// lifetime of the process — the slug never changes at runtime.

import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tenants } from '../db/schema.js';

const TENANT_SLUG = process.env.TENANT_SLUG ?? 'gesmarketim';

let cachedTenantId: string | null = null;

/**
 * Returns the id of the active tenant, looking it up once and caching it.
 * Throws if the configured tenant slug does not exist.
 */
export async function getTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, TENANT_SLUG))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found for slug "${TENANT_SLUG}"`);
  }

  cachedTenantId = tenant.id;
  return cachedTenantId;
}
