import { TablePageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";

export default function Loading() {
  return <TablePageLoadingSkeleton label="Loading price sheet" rows={10} />;
}
