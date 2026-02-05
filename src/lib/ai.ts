import type { RepoInfo, RepoSummary } from "./types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface SummarizeInput {
  repoInfo: RepoInfo;
  readme: string | null;
  fileTree: string[];
  packageJson: Record<string, unknown> | null;
}

export async function generateSummary(
  input: SummarizeInput,
  apiKey: string
): Promise<RepoSummary> {
  const { repoInfo, readme, fileTree, packageJson } = input;

  const fileTreeStr = fileTree.length > 0
    ? fileTree.slice(0, 100).join("\n")
    : "No file tree available";

  const depsStr = packageJson
    ? JSON.stringify(
        {
          dependencies: (packageJson as Record<string, unknown>).dependencies,
          devDependencies: (packageJson as Record<string, unknown>).devDependencies,
        },
        null,
        2
      ).slice(0, 1500)
    : "No package.json";

  const prompt = `You are an expert developer. Analyze this GitHub repository and provide a concise, useful summary.

Repository: ${repoInfo.fullName}
Description: ${repoInfo.description || "None"}
Language: ${repoInfo.language || "Unknown"}
Stars: ${repoInfo.stars} | Forks: ${repoInfo.forks}
Topics: ${repoInfo.topics.join(", ") || "None"}

README (first 4000 chars):
${readme || "No README available"}

File structure:
${fileTreeStr}

Dependencies:
${depsStr}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "overview": "2-3 sentence overview of what this project does and why it matters",
  "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "techStack": ["tech1", "tech2", "tech3"],
  "architecture": "1-2 sentence description of the project architecture and key patterns",
  "quickStart": "Brief getting-started instructions (1-3 steps)",
  "useCases": ["use case 1", "use case 2", "use case 3"]
}`;

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error("Invalid API key");
    if (res.status === 429) throw new Error("Rate limited. Try again in a minute.");
    throw new Error(`AI API error: ${res.status} — ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";

  // Parse JSON from response (handle possible markdown fences)
  const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      overview: parsed.overview || "No overview available",
      keyFeatures: parsed.keyFeatures || [],
      techStack: parsed.techStack || [],
      architecture: parsed.architecture || "",
      quickStart: parsed.quickStart || "",
      useCases: parsed.useCases || [],
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback: try to extract JSON from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        overview: parsed.overview || "No overview available",
        keyFeatures: parsed.keyFeatures || [],
        techStack: parsed.techStack || [],
        architecture: parsed.architecture || "",
        quickStart: parsed.quickStart || "",
        useCases: parsed.useCases || [],
        generatedAt: new Date().toISOString(),
      };
    }
    throw new Error("Failed to parse AI response");
  }
}
