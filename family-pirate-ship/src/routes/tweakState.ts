/**
 * Module-scoped dev tweaks. The v2 app kept these in App.tsx useState; since
 * the state only ever flows from the panel to the drive tick, a mutable
 * module object is simpler than wiring yet another Zustand store.
 *
 * Phase 2 will gate this whole module behind import.meta.env.DEV at the
 * consumer side. The TweaksPanel already self-hides in production.
 */
export const tweakState = {
    // TEMPORARY: on in production for 8× time acceleration during testing.
    // Flip back to false (and redeploy) to return to real-time — the
    // TweaksPanel is DEV-only so there is no in-app toggle in prod.
    demoFastClock: true,
};
