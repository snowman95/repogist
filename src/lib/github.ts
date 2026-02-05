import type { RepoInfo } from "./types";

const GITHUB_API = "https://api.github.com";

/** Extract owner/repo from a GitHub URL */
export function parseGitHubUrl(
  url: string
): { owner: string; repo: string } | null {
  const match = url.match(
    /github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
  );
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

/** Fetch basic repo metadata */
export async function fetchRepoInfo(
  owner: string,
  repo: string
): Promise<RepoInfo> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error("Repository not found");
    if (res.status === 403) throw new Error("GitHub API rate limit exceeded");
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    owner,
    repo,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    topics: data.topics || [],
    defaultBranch: data.default_branch,
  };
}

/** Fetch README content */
export async function fetchReadme(
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: { Accept: "application/vnd.github.v3.raw" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Truncate to ~4000 chars to save tokens
    return text.length > 4000 ? text.slice(0, 4000) + "\n...(truncated)" : text;
  } catch {
    return null;
  }
}

/** Fetch repo file tree (top-level + key dirs) */
export async function fetchFileTree(
  owner: string,
  repo: string,
  branch: string
): Promise<string[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Return first 200 paths (enough for structure analysis)
    return (data.tree || [])
      .filter((t: { type: string }) => t.type === "blob" || t.type === "tree")
      .slice(0, 200)
      .map((t: { path: string }) => t.path);
  } catch {
    return [];
  }
}

/** Fetch package.json (if exists) for dependency analysis */
export async function fetchPackageJson(
  owner: string,
  repo: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/package.json`,
      { headers: { Accept: "application/vnd.github.v3.raw" } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
