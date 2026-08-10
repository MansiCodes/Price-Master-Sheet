import { ReactNode } from "react";

type AlertProps = {
  type?: "error" | "ok";
  children: ReactNode;
};

export function Alert({ type = "ok", children }: AlertProps) {
  return <div className={`alert alert--${type}`}>{children}</div>;
}
