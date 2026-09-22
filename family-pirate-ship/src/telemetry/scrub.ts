/**
 * Strips identifying data out of a diagnostic `detail` string before it
 * leaves the device.
 *
 * This is the highest-stakes file in the telemetry channel. Pirate names are
 * children's names, and an error message that interpolates app state — or a
 * thrown value that happens to include a row — would put them in a database
 * whose whole point is that it gets read by a human later.
 *
 * The rule is subtractive and closed: strip everything known to identify,
 * truncate what's left, and accept that an over-scrubbed message is a much
 * cheaper mistake than an under-scrubbed one.
 *
 * Structured data never comes through here — `context` is typed per code in
 * codes.ts and carries numbers and enums only.
 */

export const MAX_DETAIL_LENGTH = 300;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
/** Supabase JWTs and anything else shaped like a bearer token. */
const JWT_RE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g;
/** Long hex runs — session tokens, hashes, our own family_id_hash. */
const LONG_HEX_RE = /\b[0-9a-f]{24,}\b/gi;

function escapeForRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ScrubNames {
    /** Current pirate names — children's names. Always supply these. */
    pirates?: string[];
    /** The family's own name. */
    family?: string | null;
}

/**
 * Redact a free-text detail string.
 *
 * Name removal runs last and is deliberately blunt: a whole-word, case-
 * insensitive match on each supplied name. Short names (one or two
 * characters) are skipped, because a one-letter match would shred every
 * message into `[name]`s and the redaction would be worse than useless.
 */
export function scrubDetail(input: unknown, names: ScrubNames = {}): string | null {
    if (input === null || input === undefined) return null;

    let text = typeof input === 'string' ? input : String(input);
    if (!text.trim()) return null;

    text = text
        .replace(EMAIL_RE, '[email]')
        .replace(JWT_RE, '[token]')
        .replace(UUID_RE, '[id]')
        .replace(LONG_HEX_RE, '[hash]');

    const candidates = [...(names.pirates ?? []), names.family ?? ''].filter(
        (n): n is string => typeof n === 'string' && n.trim().length > 2,
    );
    for (const name of candidates) {
        // No \b — it is defined in terms of ASCII word characters and does
        // not fire at the edges of Hebrew text, which is what these names
        // actually are. Match the bare name and let over-matching win.
        text = text.replace(new RegExp(escapeForRegex(name.trim()), 'gi'), '[name]');
    }

    text = text.trim();
    if (!text) return null;
    return text.length > MAX_DETAIL_LENGTH ? text.slice(0, MAX_DETAIL_LENGTH) : text;
}

/**
 * Turn a caught value into a scrubbed detail string.
 *
 * Stack traces are deliberately dropped — the bundle is minified and we
 * publish no source maps, so frames read as `index-BuaT9b9Y.js:1:12345` and
 * carry no information a human can use. The breadcrumb trail is what makes
 * stacks unnecessary here. (Settled 2026-09-22; revisit if the breadcrumbs
 * turn out to be insufficient.)
 */
export function scrubError(err: unknown, names: ScrubNames = {}): string | null {
    if (err instanceof Error) {
        const name = err.name || 'Error';
        const message = scrubDetail(err.message, names);
        return message ? `${name}: ${message}` : name;
    }
    return scrubDetail(err, names);
}
