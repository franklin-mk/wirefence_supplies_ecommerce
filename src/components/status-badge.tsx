import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-accent/20 text-fg",
  PAID: "bg-success/20 text-success",
  FAILED: "bg-danger/20 text-danger",
  PROCESSING: "bg-primary/20 text-primary",
  IN_TRANSIT: "bg-primary/20 text-primary",
  DELIVERED: "bg-success/20 text-success",
  CANCELLED: "bg-border text-muted",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLES[status]}`}>{status.replace(/_/g, " ")}</span>;
}
