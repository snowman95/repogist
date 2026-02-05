export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
}

export interface RepoSummary {
  overview: string;
  keyFeatures: string[];
  techStack: string[];
  architecture: string;
  quickStart: string;
  useCases: string[];
  generatedAt: string;
}

export interface CachedSummary {
  repoFullName: string;
  summary: RepoSummary;
  cachedAt: number; // timestamp
}

export interface UserSettings {
  apiKey: string;
  dailyUsage: number;
  lastUsageDate: string;
  isPro: boolean;
}

export const FREE_DAILY_LIMIT = 3;
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
