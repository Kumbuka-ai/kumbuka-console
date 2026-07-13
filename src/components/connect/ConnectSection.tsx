import { existsSync } from "node:fs";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { getLocale } from "@/lib/locale";
import {
  apparatusFor,
  pickerAgents,
  visibleCells,
  type ConnectApparatus,
} from "@/connect/manifest";
import { loadGuide } from "@/connect/load";
import { ConnectBlock1 } from "./ConnectBlock1";
import { InstructionBlock } from "./InstructionBlock";
import { UsageBlock } from "./UsageBlock";
import type { RenderableCell, TokenValues } from "./types";
import type { ConnectorView, ScopeView } from "@/lib/api/types";

/**
 * The connect area — three blocks under each other:
 *
 *  1. "Verbindung herstellen" (collapsible): the verified cells behind
 *     the agent picker, or — with nothing verified — the agent-agnostic
 *     connector card. The access-guarantee panel always travels inside.
 *  2. "Anweisung für den Assistenten" (permanently visible).
 *  3. "So benutzt du kumbuka" (permanently visible).
 *
 * Server component: it parses the verified cells' guide documents, probes
 * their screenshot files (images arrive without a code change), and fills
 * the placeholder tokens with the tenant's values — the client renders
 * only filled values.
 */
export async function ConnectSection({
  connector,
  scopes,
}: Readonly<{ connector: ConnectorView; scopes: ScopeView[] }>) {
  const [locale, t, ti] = await Promise.all([
    getLocale(),
    getTranslations("connect"),
    getTranslations("connect.instruction"),
  ]);

  const agents = pickerAgents();
  const tabsByAgent: Record<string, ConnectApparatus[]> = {};
  for (const a of agents) {
    tabsByAgent[a.slug] = apparatusFor(a.slug);
  }

  const cells: Record<string, RenderableCell> = {};
  for (const cell of visibleCells()) {
    if (!cell.doc) {
      throw new Error(`verified cell ${cell.agent}/${cell.apparatus} carries no doc`);
    }
    const guide = loadGuide(cell.doc, locale);
    cells[`${cell.agent}/${cell.apparatus}`] = {
      agent: cell.agent,
      apparatus: cell.apparatus,
      title: guide.title,
      steps: guide.steps.map((step) => ({
        n: step.n,
        text: step.text,
        boxes: step.boxes,
        shots: step.shots.map((shot) => {
          // Language-bound image path — a missing image stays a
          // placeholder, NEVER the other language's screenshot.
          const rel = `/connect/${cell.shots ?? cell.doc}/${locale}/step-${shot.id}.png`;
          const exists = existsSync(path.join(process.cwd(), "public", rel));
          return { id: shot.id, caption: shot.caption, src: exists ? rel : null };
        }),
      })),
    };
  }

  // Filled token values. SCOPE_SLUG / INSTRUCTION_BLOCK use the default
  // scope (the org-wide baseline) — Block 2 below is where the user picks
  // a scope interactively.
  const pinnable = scopes.filter((s) => !s.archived);
  const defaultScope =
    pinnable.find((s) => s.kind === "global")?.slug ?? pinnable[0]?.slug ?? "global";
  const values: TokenValues = {
    ENDPOINT: connector.mcpUrl,
    SCOPE_SLUG: defaultScope,
    INSTRUCTION_BLOCK: ti("block", { slug: defaultScope }),
  };

  return (
    <section className="connect-wz" aria-label="Connect">
      <div className="cw-head">
        <div className="cw-intro">
          <span className="eyebrow">{"// "}{t("eyebrow")}</span>
          <h2>{t("title")}</h2>
          <p className="cw-lead">{t("lead")}</p>
        </div>
      </div>

      <ConnectBlock1
        agents={agents}
        tabsByAgent={tabsByAgent}
        cells={cells}
        values={values}
        connector={connector}
        scopes={scopes}
      />

      <InstructionBlock scopes={scopes} />

      <UsageBlock />
    </section>
  );
}
