import { Icon } from "@/components/ui/Icon";

/** Private-guarantee surface 2 of 5. */
export function GuaranteeBand() {
  return (
    <div className="guarantee-band">
      <div className="gb-lock">
        <Icon name="lock" />
      </div>
      <div>
        <h4>Private memory stays private</h4>
        <p>
          Every member has a private scope the assistant uses for them alone. It is owned by the
          member and is never surfaced on this dashboard, in the scope browser, or through the
          connector above.
        </p>
      </div>
      <span className="gb-tag">
        <Icon name="ok" />
        guaranteed by design
      </span>
    </div>
  );
}
