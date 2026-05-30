import { ImageIcon } from "lucide-react";

export function PersonaCover({
  src,
  emptyLabel,
}: {
  src: string | null;
  emptyLabel: string;
}) {
  if (src) {
    return (
      <div
        className="aspect-video bg-surface-card-deep bg-cover bg-center"
        style={{ backgroundImage: `url("${src}")` }}
      />
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center bg-surface-card-deep">
      <div className="text-center text-muted-foreground">
        <ImageIcon className="mx-auto h-8 w-8" aria-hidden="true" />
        <p className="mt-2 text-xs keep-all">{emptyLabel}</p>
      </div>
    </div>
  );
}
