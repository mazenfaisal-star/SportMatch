import { createClient } from '@supabase/supabase-js';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

function readLegacyJwtRole(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)).role || null;
  } catch {
    return null;
  }
}

function isSafeBrowserKey(key) {
  if (!key) return false;
  // New Supabase secret keys must never be shipped in browser code.
  if (key.startsWith('sb_secret_')) return false;
  // Reject legacy service_role JWTs as well as new secret keys.
  if (readLegacyJwtRole(key) === 'service_role') return false;
  // Accept current publishable keys and legacy anon JWTs only.
  return key.startsWith('sb_publishable_') || readLegacyJwtRole(key) === 'anon';
}

function isSafeProjectUrl(value) {
  try {
    const url = new URL(value);
    const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    return (url.protocol === 'https:' || isLocalHttp) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const supabaseConfigIssue = !supabaseUrl || !supabasePublishableKey
  ? 'missing'
  : !isSafeProjectUrl(supabaseUrl)
    ? 'invalid-url'
    : !isSafeBrowserKey(supabasePublishableKey)
      ? 'unsafe-key'
      : null;

export const isSupabaseConfigured = supabaseConfigIssue === null;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
