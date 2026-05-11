import { create } from 'zustand';
import type { AuthUser, Family, FamilyMember, Role } from '../types';
import * as authApi from '../api/auth';
import { getMyFamilyAndRole, listMembers } from '../api/families';
import { listMembersWithProfile } from '../api/invites';

/**
 * Auth store wired to Supabase. The bootstrapper in `App.tsx` handles
 * onMount session resolution and subscribes to auth changes; the store
 * itself only exposes synchronous state + the imperative actions a screen
 * or guard might call.
 */
export interface AuthState {
    user: AuthUser | null;
    family: Family | null;
    members: FamilyMember[];
    role: Role | null;
    /** True until we've checked for an existing session at least once. */
    isLoading: boolean;
    /**
     * The last family-resolution error, if any. Non-null means we tried to
     * fetch the family and the call threw — so we don't know if the user
     * actually has no family (onboarding) or the fetch simply failed. Surfaced
     * by AuthCallback / FamilyNaming so we don't loop through onboarding.
     */
    familyError: string | null;

    setUser: (u: AuthUser | null) => void;
    setFamily: (f: Family | null) => void;
    setMembers: (m: FamilyMember[]) => void;
    setRole: (r: Role | null) => void;
    setLoading: (b: boolean) => void;

    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    /** Re-fetch family + members for the current user. */
    refreshFamily: () => Promise<void>;
    /** Clear all auth-related state (used on sign-out). */
    clearAll: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    family: null,
    members: [],
    role: null,
    isLoading: true,
    familyError: null,

    setUser: (u) => set({ user: u }),
    setFamily: (f) => set({ family: f }),
    setMembers: (m) => set({ members: m }),
    setRole: (r) => set({ role: r }),
    setLoading: (b) => set({ isLoading: b }),

    signInWithGoogle: async () => {
        await authApi.signInWithGoogle();
    },

    signOut: async () => {
        await authApi.signOut();
        get().clearAll();
    },

    refreshFamily: async () => {
        const { user } = get();
        if (!user) {
            set({ family: null, members: [], role: null, familyError: null });
            return;
        }
        try {
            const result = await getMyFamilyAndRole();
            if (!result) {
                // Legit no-family state — user needs onboarding.
                set({ family: null, members: [], role: null, familyError: null });
                return;
            }
            // Prefer the profile-enriched RPC so the Settings crew list
            // can show display names + emails. Falls back to the lean
            // RLS-scoped list if the RPC is missing (e.g. an older DB
            // without the 0006 migration applied).
            let members: FamilyMember[];
            try {
                members = await listMembersWithProfile();
            } catch (memErr) {
                console.warn(
                    '[authStore.refreshFamily] list_family_members_with_profile failed, falling back',
                    memErr,
                );
                members = await listMembers(result.family.id);
            }
            set({
                family: result.family,
                role: result.role,
                members,
                familyError: null,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[authStore.refreshFamily] failed', err);

            // Stale JWT: the token is still in localStorage but the user
            // row was deleted (or the project was reset). Recovery is to
            // force sign-out so the user can sign back in with a fresh
            // session. Without this branch the user loops onboarding.
            if (
                /user from sub claim/i.test(msg) ||
                /user not found/i.test(msg) ||
                /invalid jwt/i.test(msg)
            ) {
                console.warn(
                    '[authStore.refreshFamily] stale JWT detected — signing out',
                );
                try {
                    await authApi.signOut();
                } catch {
                    /* ignore */
                }
                set({
                    user: null,
                    family: null,
                    members: [],
                    role: null,
                    familyError: null,
                });
                return;
            }

            // Keep whatever we had cached; flag the error so callers can
            // distinguish "no family" from "couldn't check."
            set({ familyError: msg });
        }
    },

    clearAll: () =>
        set({ user: null, family: null, members: [], role: null, familyError: null }),
}));
