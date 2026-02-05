import { parseGitHubUrl, fetchRepoInfo, fetchReadme, fetchFileTree, fetchPackageJson } from "../lib/github";
import { generateSummary } from "../lib/ai";
import { getSettings, incrementUsage, canGenerate, getCachedSummary, cacheSummary } from "../lib/storage";
import type { RepoSummary } from "../lib/types";

export type MessageAction =
  | { type: "SUMMARIZE"; url: string }
  | { type: "GET_SETTINGS" }
  | { type: "CHECK_LIMIT" };

export type MessageResponse =
  | { type: "SUMMARY_RESULT"; summary: RepoSummary; fromCache: boolean }
  | { type: "SUMMARY_ERROR"; error: string }
  | { type: "SETTINGS_RESULT"; apiKey: string; dailyUsage: number; isPro: boolean }
  | { type: "LIMIT_RESULT"; allowed: boolean; remaining: number };

chrome.runtime.onMessage.addListener(
  (message: MessageAction, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // async response
  }
);

async function handleMessage(
  message: MessageAction
): Promise<MessageResponse> {
  switch (message.type) {
    case "SUMMARIZE":
      return handleSummarize(message.url);
    case "GET_SETTINGS": {
      const s = await getSettings();
      return { type: "SETTINGS_RESULT", apiKey: s.apiKey, dailyUsage: s.dailyUsage, isPro: s.isPro };
    }
    case "CHECK_LIMIT": {
      const { allowed, remaining } = await canGenerate();
      return { type: "LIMIT_RESULT", allowed, remaining };
    }
    default:
      return { type: "SUMMARY_ERROR", error: "Unknown action" };
  }
}

async function handleSummarize(
  url: string
): Promise<MessageResponse> {
  try {
    // 1. Parse URL
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return { type: "SUMMARY_ERROR", error: "Not a valid GitHub repository URL" };
    }

    // 2. Check cache
    const fullName = `${parsed.owner}/${parsed.repo}`;
    const cached = await getCachedSummary(fullName);
    if (cached) {
      return { type: "SUMMARY_RESULT", summary: cached.summary, fromCache: true };
    }

    // 3. Check usage limit
    const { allowed } = await canGenerate();
    if (!allowed) {
      return {
        type: "SUMMARY_ERROR",
        error: "Daily free limit reached. Enter your API key in settings for unlimited access.",
      };
    }

    // 4. Check API key
    const settings = await getSettings();
    if (!settings.apiKey) {
      return {
        type: "SUMMARY_ERROR",
        error: "Please set your Anthropic API key in the extension settings.",
      };
    }

    // 5. Fetch repo data (parallel)
    const [repoInfo, readme, fileTree, packageJson] = await Promise.all([
      fetchRepoInfo(parsed.owner, parsed.repo),
      fetchReadme(parsed.owner, parsed.repo),
      fetchFileTree(parsed.owner, parsed.repo, "main").then((tree) =>
        tree.length > 0
          ? tree
          : fetchFileTree(parsed.owner, parsed.repo, "master")
      ),
      fetchPackageJson(parsed.owner, parsed.repo),
    ]);

    // 6. Generate AI summary
    const summary = await generateSummary(
      { repoInfo, readme, fileTree, packageJson },
      settings.apiKey
    );

    // 7. Cache + increment usage
    await cacheSummary({ repoFullName: fullName, summary, cachedAt: Date.now() });
    await incrementUsage();

    return { type: "SUMMARY_RESULT", summary, fromCache: false };
  } catch (err) {
    return {
      type: "SUMMARY_ERROR",
      error: err instanceof Error ? err.message : "Failed to generate summary",
    };
  }
}
