"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import ChatPanel from "@/components/ChatPanel";
import DocsSidebar from "@/components/DocsSidebar";
import type { SampleLoadingState } from "@/components/StrudelRepl";

const StrudelRepl = dynamic(() => import("@/components/StrudelRepl"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full opacity-50 text-sm">
      Loading Strudel REPL...
    </div>
  ),
});

type MobileTab = "repl" | "docs" | "chat";

/**
 * Lightweight validation for Strudel code. Returns an array of warning messages.
 * Does NOT block execution — just surfaces potential issues to the user.
 */
function validateStrudelCode(code: string): string[] {
  const warnings: string[] = [];

  // Check for pipe characters inside string literals (mini-notation patterns)
  // Match string contents inside single or double quotes
  const stringPattern = /(['"`])(?:(?!\1|\\).|\\.)*\1/g;
  let match;
  while ((match = stringPattern.exec(code)) !== null) {
    const content = match[0].slice(1, -1); // strip quotes
    if (content.includes("|")) {
      warnings.push(
        `Invalid "|" (pipe) found in pattern "${content.length > 40 ? content.slice(0, 40) + "…" : content}". ` +
        `The pipe character is not valid mini-notation — use spaces or square brackets instead.`
      );
    }
  }

  // Check for unbalanced brackets/parens in the overall code
  let parens = 0, brackets = 0, braces = 0;
  for (const ch of code) {
    if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
    else if (ch === "{") braces++;
    else if (ch === "}") braces--;
  }
  if (parens !== 0) warnings.push(`Unbalanced parentheses in code (${parens > 0 ? `${parens} unclosed` : `${-parens} extra closing`}).`);
  if (brackets !== 0) warnings.push(`Unbalanced square brackets in code (${brackets > 0 ? `${brackets} unclosed` : `${-brackets} extra closing`}).`);
  if (braces !== 0) warnings.push(`Unbalanced curly braces in code (${braces > 0 ? `${braces} unclosed` : `${-braces} extra closing`}).`);

  return warnings;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function Home() {
  const [docsCollapsed, setDocsCollapsed] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [loadedSounds, setLoadedSounds] = useState<string[]>([]);
  const [samplesReady, setSamplesReady] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("repl");
  const [lastCodeFromAi, setLastCodeFromAi] = useState(false);
  const isMobile = useIsMobile();

  const handleInsertCode = useCallback((code: string) => {
    const editor = document.querySelector("strudel-editor") as HTMLElement & {
      editor?: { stop: () => void };
    } | null;
    if (editor) {
      // Validate AI-generated code and surface warnings
      const warnings = validateStrudelCode(code);
      if (warnings.length > 0) {
        // Emit as strudel.log so the error toast picks it up
        document.dispatchEvent(new CustomEvent("strudel.log", {
          detail: { message: warnings[0], type: "error" },
        }));
      }

      setLastCodeFromAi(true);
      editor.setAttribute("code", code);
      // Re-evaluate so the new code starts playing immediately
      document.dispatchEvent(new CustomEvent("repl-evaluate"));
    }
    // Switch to REPL tab on mobile after inserting code
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileTab("repl");
    }
  }, []);

  const handleInsertAtCursor = useCallback((code: string) => {
    const el = document.querySelector("strudel-editor") as HTMLElement & {
      editor?: {
        editor: { state: { selection: { main: { head: number } } }; dispatch: (tr: unknown) => void };
      };
    } | null;
    const cm = el?.editor?.editor;
    if (cm) {
      setLastCodeFromAi(true);
      const pos = cm.state.selection.main.head;
      cm.dispatch({ changes: { from: pos, insert: code } });
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileTab("repl");
    }
  }, []);

  const handleSamplesLoaded = useCallback((state: SampleLoadingState, sounds: string[]) => {
    setSamplesReady(state === "ready");
    setLoadedSounds(sounds);
  }, []);

  const getCurrentCode = useCallback(() => {
    const editor = document.querySelector("strudel-editor") as HTMLElement & {
      editor?: { getCode?: () => string };
    } | null;
    return editor?.editor?.getCode?.() ?? "";
  }, []);

  // Mobile layout: tab-based, one panel at a time
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <Header />

        <div className="flex-1 overflow-hidden" style={{ paddingBottom: 52 }}>
          {mobileTab === "repl" && (
            <div className="h-full">
              <StrudelRepl onSamplesLoaded={handleSamplesLoaded} lastCodeFromAi={lastCodeFromAi} />
            </div>
          )}
          {mobileTab === "docs" && (
            <div className="h-full overflow-y-auto">
              <DocsSidebar
                collapsed={false}
                onToggle={() => setMobileTab("repl")}
                onExampleClick={handleInsertCode}
                fullWidth
              />
            </div>
          )}
          {mobileTab === "chat" && (
            <div className="h-full">
              <ChatPanel
                onInsertCode={handleInsertCode}
                onInsertAtCursor={handleInsertAtCursor}
                samplesReady={samplesReady}
                loadedSounds={loadedSounds}
                getCurrentCode={getCurrentCode}
              />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="mobile-tab-bar">
          <button
            className={mobileTab === "docs" ? "active" : ""}
            onClick={() => setMobileTab("docs")}
          >
            <span style={{ fontSize: 16 }}>📖</span>
            Docs
          </button>
          <button
            className={mobileTab === "repl" ? "active" : ""}
            onClick={() => setMobileTab("repl")}
          >
            <span style={{ fontSize: 16 }}>🎵</span>
            REPL
          </button>
          <button
            className={mobileTab === "chat" ? "active" : ""}
            onClick={() => setMobileTab("chat")}
          >
            <span style={{ fontSize: 16 }}>💬</span>
            Chat
          </button>
        </div>
      </div>
    );
  }

  // Desktop layout: three-column (unchanged)
  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Docs sidebar */}
        <div
          className="border-r flex-shrink-0"
          style={{ borderColor: "var(--panel-border)" }}
        >
          <DocsSidebar
            collapsed={docsCollapsed}
            onToggle={() => setDocsCollapsed((c) => !c)}
            onExampleClick={handleInsertCode}
          />
        </div>

        {/* REPL (center) */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <StrudelRepl onSamplesLoaded={handleSamplesLoaded} lastCodeFromAi={lastCodeFromAi} />
        </div>

        {/* Chat panel */}
        {chatVisible && (
          <div
            className="border-l flex-shrink-0"
            style={{
              borderColor: "var(--panel-border)",
              width: 360,
            }}
          >
            <ChatPanel
              onInsertCode={handleInsertCode}
              onInsertAtCursor={handleInsertAtCursor}
              samplesReady={samplesReady}
              loadedSounds={loadedSounds}
              getCurrentCode={getCurrentCode}
            />
          </div>
        )}

        {/* Chat toggle when hidden */}
        {!chatVisible && (
          <div
            className="flex flex-col items-center py-3 cursor-pointer border-l flex-shrink-0"
            style={{
              background: "var(--panel-bg)",
              borderColor: "var(--panel-border)",
              width: 36,
            }}
            onClick={() => setChatVisible(true)}
          >
            <span className="text-sm" title="Show chat">💬</span>
            <span
              className="text-xs mt-1"
              style={{ writingMode: "vertical-rl" }}
            >
              Chat
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
