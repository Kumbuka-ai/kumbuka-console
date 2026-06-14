"use client";

import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

/**
 * A ready-to-paste set of project instructions the user drops into their Claude
 * or ChatGPT project so the assistant uses kumbuka from the first turn. Kept
 * client-agnostic (works for any MCP-capable assistant) and aligned with the
 * actual tool surface (memory_load_context / memory_recall / memory_remember).
 */
const PROMPT = `You have access to kumbuka — our team's shared memory — through its MCP connector. Treat it as the source of truth for how this team works, and keep it up to date as we work.

At the start of each session:
- Call memory_load_context to load the team's steering knowledge (decisions, conventions, constraints, glossary, status) and apply it without being told again.

While you work:
- Before answering about our setup, conventions, or past decisions, call memory_recall to check what is already recorded. Prefer recorded team knowledge over assumptions.
- When we settle a decision, agree a convention, set a constraint, define a term, or note a status, call memory_remember to save it. Choose the right type (decision, convention, constraint, open_question, glossary, status) and keep each entry to a single clear statement — not a document.
- If something important is missing or wrong, ask, then offer to remember the corrected answer.

Scopes:
- Shared scopes (global and the project scopes) are visible to the whole team — never put secrets or sensitive personal data there.
- Your private scope is yours alone; use it for personal working notes.`;

export function AssistantPrompt() {
  const toast = useToast();
  const copy = async () => {
    await navigator.clipboard?.writeText(PROMPT);
    toast.push({ message: "Instructions copied to clipboard" });
  };

  return (
    <div className="assistant-prompt">
      <div className="ap-head">
        <div className="ap-intro">
          <span className="eyebrow">{"// "}project instructions</span>
          <h3>Prime your assistant</h3>
          <p className="ap-lead">
            Paste this into your Claude or ChatGPT <b>project instructions</b> so the
            assistant uses kumbuka from the first turn — loading the team&apos;s steering
            knowledge and recording new decisions as you work.
          </p>
        </div>
        <button className="ap-copy" onClick={copy} type="button">
          <Icon name="copy" />
          Copy
        </button>
      </div>
      <pre className="ap-prompt">
        <code>{PROMPT}</code>
      </pre>
    </div>
  );
}
