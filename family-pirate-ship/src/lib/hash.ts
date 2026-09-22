/**
 * Family-id hashing for telemetry.
 *
 * The salt is generated once per install and never rotated (see README), so
 * the same family produces a stable hash across sessions — enough to ask "is
 * this the same household hitting this error repeatedly?" without the
 * telemetry tables ever holding a real family id, and without any way to join
 * a diagnostic row back to a person.
 *
 * Web Crypto's digest is async, which is why `family_id_hash` is stamped at
 * flush time rather than record time (see telemetry/record.ts).
 */

const cache = new Map<string, string>();

/**
 * Read at call time, not module load, so the value is stubbable in tests and
 * a late-injected env can still take effect. The cost is a property read per
 * hash, against a map lookup that usually short-circuits anyway.
 */
function salt(): string {
    return import.meta.env.VITE_TELEMETRY_HASH_SALT ?? '';
}

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * SHA-256 over salt + id. Returns null when the salt is missing or Web Crypto
 * is unavailable — telemetry then travels without a family id rather than
 * falling back to something weaker, because an unsalted hash of a UUID is
 * just the UUID to anyone holding the table.
 */
export async function hashFamilyId(familyId: string): Promise<string | null> {
    const key = salt();
    if (!key || !familyId) return null;

    const cached = cache.get(familyId);
    if (cached) return cached;

    try {
        const bytes = new TextEncoder().encode(`${key}${familyId}`);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        const hex = toHex(digest);
        cache.set(familyId, hex);
        return hex;
    } catch {
        return null;
    }
}
