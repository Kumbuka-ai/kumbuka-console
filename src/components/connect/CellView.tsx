"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import type { GuideSegment, GuideToken } from "@/connect/guide";
import type { RenderableCell, TokenValues } from "./types";

/** Small copy box — one canonical, FILLED value with its copy button. */
function ValueBox({ token, values }: Readonly<{ token: GuideToken; values: TokenValues }>) {
  const t = useTranslations("connect.values");
  const tc = useTranslations("common");
  const toast = useToast();
  const value = values[token];
  const copy = async () => {
    await navigator.clipboard?.writeText(value);
    toast.push({ message: tc("copied") });
  };
  return (
    <div className="copybox">
      <span className="cb-label">{t(token)}</span>
      <div className="cb-row">
        <code className="cb-val">{value}</code>
        <button className="cb-btn" onClick={copy} type="button" aria-label={`${tc("copy")}: ${t(token)}`}>
          <Icon name="copy" />
        </button>
      </div>
    </div>
  );
}

function Segments({ segments, values }: Readonly<{ segments: GuideSegment[]; values: TokenValues }>) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === "code") return <code key={i}>{seg.text}</code>;
        if (seg.kind === "token") return <code key={i}>{values[seg.token]}</code>;
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}

/** Screenshot slot — the real image when the operator dropped one, else
 *  an honest placeholder. Images arrive without a code change. */
function ShotSlot({ n, caption, src }: Readonly<{ n: number; caption: string; src: string | null }>) {
  const t = useTranslations("connect.cell");
  return (
    <figure className="shot-slot" aria-label={`Screenshot ${n}: ${caption}`}>
      <div className="shot-frame">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="shot-img" src={src} alt={caption} loading="lazy" />
        ) : (
          <div className="shot-body">
            <Icon name="maximize" />
            <span className="shot-note">{t("shotPending")}</span>
            <span className="shot-hint">{t("shotHint")}</span>
          </div>
        )}
      </div>
      <figcaption className="shot-cap">
        <span className="sc-n">{n}</span>
        {caption}
      </figcaption>
    </figure>
  );
}

/**
 * One verified cell: the numbered steps with their filled value boxes and
 * screenshot slots. Every value that lands in a copy box is the FILLED
 * tenant value — placeholders never reach the user.
 */
export function CellView({ cell, values }: Readonly<{ cell: RenderableCell; values: TokenValues }>) {
  return (
    <div className={`cell ${cell.apparatus}`}>
      <ol className="csteps">
        {cell.steps.map((step) => (
          <li className="cstep" key={step.n}>
            <span className="cstep-n">{step.n}</span>
            <div className="cstep-body">
              <div className="cstep-text">
                <Segments segments={step.text} values={values} />
              </div>
              {step.boxes.map((token) => (
                <ValueBox key={token} token={token} values={values} />
              ))}
              {step.shots.map((shot) => (
                <ShotSlot key={shot.n} n={shot.n} caption={shot.caption} src={shot.src} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
