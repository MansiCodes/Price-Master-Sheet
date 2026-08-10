import { ReactNode } from "react";
import { Button } from "./Button";

type PageToolbarProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: ReactNode;
};

export function PageToolbar({
  title,
  subtitle,
  actionLabel,
  onAction,
  action,
}: PageToolbarProps) {
  return (
    <div className="page-toolbar">
      <div className="page-toolbar__text">
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      <div className="page-toolbar__action">
        {action ??
          (actionLabel && onAction ? (
            <Button type="button" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null)}
      </div>
    </div>
  );
}
