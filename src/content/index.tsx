import type { MessageResponse } from "../background/index";
import type { RepoSummary } from "../lib/types";

const BUTTON_ID = "repogist-summarize-btn";
const PANEL_ID = "repogist-summary-panel";

/** Check if current page is a GitHub repo root */
function isRepoPage(): boolean {
  const path = window.location.pathname.split("/").filter(Boolean);
  // owner/repo (exactly 2 segments, or 2 segments followed by tree/blob etc)
  if (path.length < 2) return false;
  // Exclude settings, issues, pulls, actions pages etc when path is longer
  if (path.length > 2) return false;
  // Exclude github special pages
  const excluded = ["settings", "notifications", "marketplace", "explore", "topics", "trending", "collections", "events", "sponsors", "login", "signup", "new", "organizations"];
  if (excluded.includes(path[0])) return false;
  return true;
}

/** Find the action bar where buttons (Star, Fork, Watch) live */
function findActionBar(): Element | null {
  // GitHub's repo action bar (right side of repo title)
  const actionList = document.querySelector(
    ".pagehead-actions, [class*='BtnGroup'], .d-flex.gap-2"
  );
  if (actionList) return actionList;

  // Fallback: look for the starring form area
  const starForm = document.querySelector('form[action*="star"]');
  if (starForm?.parentElement) return starForm.parentElement;

  return null;
}

/** Inject the "Summarize" button */
function injectButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  if (!isRepoPage()) return;

  const actionBar = findActionBar();
  if (!actionBar) {
    // Retry after a short delay (SPA navigation)
    setTimeout(injectButton, 1000);
    return;
  }

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.className = "repogist-btn";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v18"/>
      <path d="M3 12h18"/>
      <circle cx="12" cy="12" r="10"/>
    </svg>
    Summarize
  `;
  btn.title = "Generate AI summary of this repository";
  btn.addEventListener("click", handleSummarize);

  actionBar.prepend(btn);
}

/** Handle summarize button click */
async function handleSummarize(): Promise<void> {
  const btn = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (!btn) return;

  // Remove existing panel
  document.getElementById(PANEL_ID)?.remove();

  // Show loading
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<div class="spinner"></div> Analyzing...';

  try {
    const response: MessageResponse = await chrome.runtime.sendMessage({
      type: "SUMMARIZE",
      url: window.location.href,
    });

    if (response.type === "SUMMARY_RESULT") {
      showSummaryPanel(response.summary, response.fromCache);
    } else if (response.type === "SUMMARY_ERROR") {
      showErrorPanel(response.error);
    }
  } catch (err) {
    showErrorPanel(
      err instanceof Error ? err.message : "Failed to generate summary"
    );
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

/** Show summary results in an inline panel */
function showSummaryPanel(summary: RepoSummary, fromCache: boolean): void {
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.className = "repogist-panel";

  const featuresHtml = summary.keyFeatures
    .map((f) => `<li>${escapeHtml(f)}</li>`)
    .join("");

  const techHtml = summary.techStack
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join("");

  const useCasesHtml = summary.useCases
    .map((u) => `<li>${escapeHtml(u)}</li>`)
    .join("");

  panel.innerHTML = `
    <button class="close-btn" title="Close summary">&times;</button>

    <div class="section">
      <h3>Overview</h3>
      <div class="overview">${escapeHtml(summary.overview)}</div>
    </div>

    ${
      summary.keyFeatures.length > 0
        ? `<div class="section">
            <h3>Key Features</h3>
            <ul class="list">${featuresHtml}</ul>
          </div>`
        : ""
    }

    ${
      summary.techStack.length > 0
        ? `<div class="section">
            <h3>Tech Stack</h3>
            <div class="tag-list">${techHtml}</div>
          </div>`
        : ""
    }

    ${
      summary.architecture
        ? `<div class="section">
            <h3>Architecture</h3>
            <div>${escapeHtml(summary.architecture)}</div>
          </div>`
        : ""
    }

    ${
      summary.quickStart
        ? `<div class="section">
            <h3>Quick Start</h3>
            <div class="quick-start">${escapeHtml(summary.quickStart)}</div>
          </div>`
        : ""
    }

    ${
      summary.useCases.length > 0
        ? `<div class="section">
            <h3>Use Cases</h3>
            <ul class="list">${useCasesHtml}</ul>
          </div>`
        : ""
    }

    <div class="meta">
      <span>${fromCache ? "Cached" : "Fresh"} · ${new Date(summary.generatedAt).toLocaleDateString()}</span>
      <span>Powered by <a href="https://github.com/snowman95/repogist" target="_blank">RepoGist</a></span>
    </div>
  `;

  // Close button handler
  panel.querySelector(".close-btn")?.addEventListener("click", () => {
    panel.remove();
  });

  // Insert after the repo description/about area
  const aboutSection = document.querySelector(
    '[class*="BorderGrid"], .repository-content, main .Layout-main'
  );
  if (aboutSection) {
    aboutSection.prepend(panel);
  } else {
    // Fallback: insert at top of main content
    const main =
      document.querySelector("main") || document.querySelector("#js-repo-pjax-container");
    if (main) {
      main.prepend(panel);
    }
  }
}

/** Show error message in panel */
function showErrorPanel(error: string): void {
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.className = "repogist-panel";
  panel.innerHTML = `
    <button class="close-btn" title="Close">&times;</button>
    <div class="error">${escapeHtml(error)}</div>
    <div class="meta">
      <span></span>
      <span>Powered by <a href="https://github.com/snowman95/repogist" target="_blank">RepoGist</a></span>
    </div>
  `;
  panel.querySelector(".close-btn")?.addEventListener("click", () => {
    panel.remove();
  });

  const aboutSection = document.querySelector(
    '[class*="BorderGrid"], .repository-content, main .Layout-main'
  );
  if (aboutSection) {
    aboutSection.prepend(panel);
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---
// Inject button on page load
injectButton();

// Re-inject on SPA navigation (GitHub uses turbo/pjax)
const observer = new MutationObserver(() => {
  if (isRepoPage() && !document.getElementById(BUTTON_ID)) {
    injectButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also listen for popstate (back/forward navigation)
window.addEventListener("popstate", () => {
  setTimeout(injectButton, 500);
});
