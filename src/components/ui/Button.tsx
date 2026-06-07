import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "primary" | "ghost" | "danger";
type Size = "md" | "sm";

export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  const classes = ["btn"];
  if (variant === "primary") classes.push("primary");
  if (variant === "ghost") classes.push("ghost");
  if (variant === "danger") classes.push("danger");
  if (size === "sm") classes.push("sm");
  if (className) classes.push(className);
  return (
    <button className={classes.join(" ")} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={`iconbtn ${className}`} {...rest}>
      {children}
    </button>
  );
}
