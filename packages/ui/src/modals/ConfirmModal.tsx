"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../primitives/Icon";
import { Button } from "../primitives/Button";

/**
 * ConfirmModal — confirmation surface for the friction ladder
 * (ops-console design handoff §5).
 *
 * Variants from a single component, gated by additional props:
 *
 *   medium  — title + body + confirm/cancel.
 *   loud    — `typedConfirm` adds a "type the slug to confirm" input.
 *   high    — `typedConfirm` + `acks` (one checkbox per acknowledgement).
 *   highest — same as high, plus a richer body with consequences
 *             (consumer renders that into the body slot).
 *
 * `context` restates "Provider action on tenant X" at the top of every
 * confirm — the design handoff's recurring "you are operating on …"
 * affordance. The confirm button stays disabled until every gate
 * (typed confirm match + all acks ticked) passes.
 */
export type Ack = {
  id: string;
  label: ReactNode;
};

export function ConfirmModal({
  eyebrow,
  title,
  body,
  target,
  context,
  typedConfirm,
  acks,
  confirmLabel,
  confirmIcon,
  danger,
  wide,
  onCancel,
  onConfirm,
}: {
  eyebrow: string;
  title: string;
  body?: ReactNode;
  /** Short identifier displayed as the operation's "object" — e.g. a slug. */
  target?: string;
  /** Optional restatement of operating context — e.g. "Provider action on tenant `acme`". */
  context?: ReactNode;
  /** When set, requires the operator to type this exact string (case-sensitive). */
  typedConfirm?: string;
  /** Acknowledgement checkboxes. All must be ticked before confirm enables. */
  acks?: Ack[];
  confirmLabel: string;
  confirmIcon?: IconName;
  danger?: boolean;
  /** Use the wider modal for richer confirmation flows (member erasure). */
  wide?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [ackState, setAckState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const typedOk = !typedConfirm || typed === typedConfirm;
  const acksOk = !acks || acks.every((a) => ackState[a.id]);
  const ready = typedOk && acksOk;

  return (
    <>
      <div className="scrim" onClick={onCancel} aria-hidden />
      <div
        className={`modal${wide ? " modal-wide" : ""}`}
        role="alertdialog"
        aria-label={title}
        aria-modal="true"
      >
        {context ? (
          <div className="modal-context" aria-live="polite">
            {context}
          </div>
        ) : null}

        <div className="modal-body">
          <span className="eyebrow" style={danger ? undefined : { color: "var(--c-accent)" }}>
            {"// "}
            {eyebrow}
          </span>
          <h3>{title}</h3>
          {body ? <div className="modal-body-text">{body}</div> : null}
          {target ? <div className="target">{target}</div> : null}

          {typedConfirm ? (
            <div className="modal-typed-confirm">
              <label htmlFor="modal-typed-input">
                Type <code>{typedConfirm}</code> to confirm
              </label>
              <input
                id="modal-typed-input"
                className="input mono"
                type="text"
                value={typed}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
              />
            </div>
          ) : null}

          {acks && acks.length > 0 ? (
            <ul className="modal-acks">
              {acks.map((a) => (
                <li key={a.id}>
                  <label className="modal-ack">
                    <input
                      type="checkbox"
                      checked={!!ackState[a.id]}
                      onChange={(e) =>
                        setAckState((prev) => ({ ...prev, [a.id]: e.target.checked }))
                      }
                    />
                    <span>{a.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="modal-foot">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            disabled={!ready}
            onClick={onConfirm}
          >
            {confirmIcon ? <Icon name={confirmIcon} /> : null}
            <span className="txt">{confirmLabel}</span>
          </Button>
        </div>
      </div>
    </>
  );
}
