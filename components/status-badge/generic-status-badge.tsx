import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusConfig = Record<string, { label: string; className: string; icon: React.ReactNode }>;

export function GenericStatusBadge({ status, config, className, children }: { status: string; config: StatusConfig; className?: string; children?: React.ReactNode }) {
  const cfg = config[status];
  if (!cfg) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2.5 py-1 text-xs font-medium border-0 transition-colors",
        cfg.className,
        className,
      )}
    >
      <span className="shrink-0 [&>svg]:size-3.5">{cfg.icon}</span>
      {cfg.label}
      {children}
    </Badge>
  );
}
