import { useState, useEffect } from "react";
import { getSettings, saveSettings, clearCache, canGenerate } from "../lib/storage";
import type { UserSettings } from "../lib/types";
import { FREE_DAILY_LIMIT } from "../lib/types";

export function Popup() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [remaining, setRemaining] = useState(FREE_DAILY_LIMIT);
  const [saved, setSaved] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await getSettings();
    setSettings(s);
    setApiKeyInput(s.apiKey);
    const { remaining: r } = await canGenerate();
    setRemaining(r === Infinity ? -1 : r);
  }

  async function handleSaveKey() {
    await saveSettings({ apiKey: apiKeyInput.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadSettings();
  }

  async function handleClearCache() {
    await clearCache();
    alert("Cache cleared!");
  }

  if (!settings) {
    return (
      <div style={{ width: 340, padding: 20, textAlign: "center", color: "#64748b" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ width: 340, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>RepoGist</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>GitHub AI Summary</div>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Today's Usage</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: remaining === 0 ? "#ef4444" : "#10b981",
            }}
          >
            {settings.isPro
              ? "Unlimited (Pro)"
              : remaining === 0
              ? "Limit reached"
              : `${settings.dailyUsage}/${FREE_DAILY_LIMIT} used`}
          </span>
        </div>
        {!settings.isPro && (
          <div
            style={{
              marginTop: 8,
              height: 4,
              background: "#e2e8f0",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(settings.dailyUsage / FREE_DAILY_LIMIT) * 100}%`,
                background: remaining === 0 ? "#ef4444" : "#6366f1",
                borderRadius: 2,
                transition: "width 0.3s",
              }}
            />
          </div>
        )}
      </div>

      {/* API Key */}
      <div style={{ padding: "16px 20px" }}>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#334155",
            marginBottom: 6,
          }}
        >
          Anthropic API Key
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                width: "100%",
                padding: "8px 36px 8px 10px",
                fontSize: 13,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                outline: "none",
                fontFamily: "monospace",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: "#94a3b8",
                padding: 0,
              }}
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={handleSaveKey}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              background: saved ? "#10b981" : "#6366f1",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
        <p
          style={{
            margin: "6px 0 0 0",
            fontSize: 11,
            color: "#94a3b8",
            lineHeight: 1.4,
          }}
        >
          Get your key at{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#6366f1" }}
          >
            console.anthropic.com
          </a>
          . Your key stays local — never sent to our servers.
        </p>
      </div>

      {/* How to use */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
          How to Use
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          <li>Go to any GitHub repository page</li>
          <li>Click the purple <strong>"Summarize"</strong> button</li>
          <li>Get instant AI-powered repo insights</li>
        </ol>
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={handleClearCache}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "#94a3b8",
            padding: 0,
          }}
        >
          Clear Cache
        </button>
        <span style={{ fontSize: 11, color: "#cbd5e1" }}>v1.0.0</span>
      </div>
    </div>
  );
}
