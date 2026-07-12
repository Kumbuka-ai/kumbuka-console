import { FeedbackLink } from "./FeedbackLink";

/**
 * Default content of the `footer.support` slot: the in-product feedback
 * entry, rendered only when its sink (`KUMBUKA_FEEDBACK_WEBHOOK_URL`) is
 * configured. An entry point whose sink is an env var is conditioned on
 * exactly that var — unconfigured is a clean absence, not a dead button.
 *
 * The env read lives here, inside the default, and NOT around the slot:
 * a build that binds its own `footer.support` component must get it
 * rendered regardless of a variable its component never reads. This is a
 * server component because `FeedbackLink` is client-side and cannot see
 * server env.
 */
export function SupportEntry() {
  const webhook = (process.env.KUMBUKA_FEEDBACK_WEBHOOK_URL ?? "").trim();
  if (webhook.length === 0) return null;
  return (
    <>
      <span className="spacer" />
      <FeedbackLink />
    </>
  );
}
