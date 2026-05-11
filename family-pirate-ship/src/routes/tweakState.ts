/**
 * Module-scoped dev tweaks. The v2 app kept these in App.tsx useState; since
 * the state only ever flows from the panel to the drive tick, a mutable
 * module object is simpler than wiring yet another Zustand store.
 *
 * Phase 2 will gate this whole module behind import.meta.env.DEV at the
 * consumer side. The TweaksPanel already self-hides in production.
 */
export const tweakState = {
    // Off in production so the Drive timer reflects real wall-clock time.
    // Flip on via the dev TweaksPanel when you want to burn through a
    // voyage for testing.
    demoFastClock: false,
};
