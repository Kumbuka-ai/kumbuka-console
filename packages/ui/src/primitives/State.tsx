import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon = "inbox",
  title,
  body,
  children,
}: Readonly<{
  icon?: IconName | string;
  title: string;
  body: string;
  children?: ReactNode;
}>) {
  return (
    <div className="state">
      <div className="state-mark">
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {children ? <div className="state-actions">{children}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  code,
  children,
}: Readonly<{
  title: string;
  body: string;
  code?: string;
  children?: ReactNode;
}>) {
  return (
    <div className="state err">
      <div className="state-mark">
        <Icon name="warn" />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {children ? <div className="state-actions">{children}</div> : null}
      {code ? <div className="err-code">{code}</div> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: Readonly<{ rows?: number }>) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skel-row" key={i}>
          <div className="skel" />
          <div className="skel" />
          <div className="skel" style={{ width: "85%" }} />
          <div className="skel" />
          <div className="skel" />
        </div>
      ))}
    </div>
  );
}
