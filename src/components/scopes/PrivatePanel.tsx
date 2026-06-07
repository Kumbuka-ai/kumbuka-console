import { Icon } from "@/components/ui/Icon";

/**
 * Private-guarantee panel — surface 1 of 5 (see handoff).
 * Persistent, non-interactive. There is no scope to "enter".
 */
export function PrivatePanel() {
  return (
    <div
      className="private-panel"
      title="Private memories are owned by each user and are not accessible from this console."
    >
      <div className="pp-head">
        <div className="pp-lock">
          <Icon name="lock" />
        </div>
        <div>
          <div className="pp-title">Private</div>
          <div className="pp-tag">per-user · not shown here</div>
        </div>
      </div>
      <div className="pp-body">
        Every member has a <b style={{ color: "var(--c-text-2)", fontWeight: 600 }}>private</b>{" "}
        memory scope. It is owned by them and is never exposed to this console — not to admins, and
        not through the API surface you manage.
      </div>
      <div className="pp-foot">
        <Icon name="ok" />
        guaranteed by design
      </div>
    </div>
  );
}
