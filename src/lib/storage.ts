import type { CachedSummary, UserSettings } from "./types";
import { CACHE_DURATION_MS, FREE_DAILY_LIMIT } from "./types";

const STORAGE_KEYS = {
  settings: "repogist_settings",
  cache: "repogist_cache",
} as const;

/** Get user settings */
export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const settings = result[STORAGE_KEYS.settings] as UserSettings | undefined;

  const today = new Date().toISOString().split("T")[0];

  if (!settings) {
    return {
      apiKey: "",
      dailyUsage: 0,
      lastUsageDate: today,
      isPro: false,
    };
  }

  // Reset daily usage if new day
  if (settings.lastUsageDate !== today) {
    const updated = { ...settings, dailyUsage: 0, lastUsageDate: today };
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: updated });
    return updated;
  }

  return settings;
}

/** Save user settings */
export async function saveSettings(
  settings: Partial<UserSettings>
): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: { ...current, ...settings },
  });
}

/** Increment daily usage */
export async function incrementUsage(): Promise<void> {
  const settings = await getSettings();
  await saveSettings({ dailyUsage: settings.dailyUsage + 1 });
}

/** Check if user can generate (under free limit or pro) */
export async function canGenerate(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const settings = await getSettings();
  if (settings.isPro) return { allowed: true, remaining: Infinity };

  const remaining = Math.max(0, FREE_DAILY_LIMIT - settings.dailyUsage);
  return { allowed: remaining > 0, remaining };
}

/** Get cached summary for a repo */
export async function getCachedSummary(
  repoFullName: string
): Promise<CachedSummary | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.cache);
  const cache = (result[STORAGE_KEYS.cache] || {}) as Record<
    string,
    CachedSummary
  >;

  const cached = cache[repoFullName];
  if (!cached) return null;

  // Check expiry
  if (Date.now() - cached.cachedAt > CACHE_DURATION_MS) {
    delete cache[repoFullName];
    await chrome.storage.local.set({ [STORAGE_KEYS.cache]: cache });
    return null;
  }

  return cached;
}

/** Save summary to cache */
export async function cacheSummary(entry: CachedSummary): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.cache);
  const cache = (result[STORAGE_KEYS.cache] || {}) as Record<
    string,
    CachedSummary
  >;

  // Keep max 50 cached summaries (LRU-like: remove oldest)
  const entries = Object.entries(cache);
  if (entries.length >= 50) {
    const oldest = entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    delete cache[oldest[0][0]];
  }

  cache[entry.repoFullName] = entry;
  await chrome.storage.local.set({ [STORAGE_KEYS.cache]: cache });
}

/** Clear all cache */
export async function clearCache(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.cache]: {} });
}
