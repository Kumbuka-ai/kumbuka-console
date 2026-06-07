import { redirect } from "next/navigation";
import { listScopes } from "@/lib/api";

export default async function ScopesIndex() {
  const scopes = await listScopes();
  const target = scopes.find((s) => s.kind === "global") ?? scopes[0];
  if (!target) redirect("/overview");
  redirect(`/scopes/${target.slug}`);
}
