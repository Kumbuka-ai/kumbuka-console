import type { GuideSegment, GuideToken } from "@/connect/guide";
import type { ConnectAgentSlug, ConnectApparatus } from "@/connect/manifest";

/**
 * Serializable render model of one verified cell — built server-side
 * (guide parsed, screenshot files probed), rendered client-side.
 */
export type RenderableShot = { n: number; caption: string; src: string | null };

export type RenderableStep = {
  n: number;
  text: GuideSegment[];
  boxes: GuideToken[];
  shots: RenderableShot[];
};

export type RenderableCell = {
  agent: ConnectAgentSlug;
  apparatus: ConnectApparatus;
  title: string;
  steps: RenderableStep[];
};

/** Filled token values — every copy box copies these, never a placeholder. */
export type TokenValues = Record<GuideToken, string>;
