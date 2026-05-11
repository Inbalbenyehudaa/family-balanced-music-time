import { supabase } from './client';
import { mapError } from './errors';
import type { Settings } from '../types';

interface SettingsRow {
    family_id: string;
    fair_winds_threshold: number;
    harbor_threshold: number;
    audio_enabled: boolean;
    fog_enabled: boolean;
    minimum_drive_minutes: number;
    telemetry_enabled: boolean;
    updated_at: string;
}

function toSettings(r: SettingsRow): Settings {
    return {
        fairWindsThreshold: r.fair_winds_threshold,
        harborThreshold: r.harbor_threshold,
        audioEnabled: r.audio_enabled,
        fogEnabled: r.fog_enabled,
        minimumDriveMinutes: r.minimum_drive_minutes,
        telemetryEnabled: r.telemetry_enabled,
    };
}

export async function getSettings(familyId: string): Promise<Settings | null> {
    const { data, error } = await supabase
        .from('family_settings')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();
    if (error) throw mapError(error);
    return data ? toSettings(data as SettingsRow) : null;
}

export async function updateSettings(
    familyId: string,
    patch: Partial<Settings>,
): Promise<void> {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.fairWindsThreshold !== undefined)
        row.fair_winds_threshold = patch.fairWindsThreshold;
    if (patch.harborThreshold !== undefined) row.harbor_threshold = patch.harborThreshold;
    if (patch.audioEnabled !== undefined) row.audio_enabled = patch.audioEnabled;
    if (patch.fogEnabled !== undefined) row.fog_enabled = patch.fogEnabled;
    if (patch.minimumDriveMinutes !== undefined)
        row.minimum_drive_minutes = patch.minimumDriveMinutes;
    if (patch.telemetryEnabled !== undefined) row.telemetry_enabled = patch.telemetryEnabled;

    const { error } = await supabase
        .from('family_settings')
        .update(row)
        .eq('family_id', familyId);
    if (error) throw mapError(error);
}
