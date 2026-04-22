"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CopyShareLinkButtonProps {
  url: string;
  label?: string;
}

export function CopyShareLinkButton({ url, label }: CopyShareLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = async () => {
    setIsLoading(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(label || "Link copied");
    } catch (err) {
      console.error("[CopyShareLinkButton] Copy failed:", err);
      toast.error("Failed to copy link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={isLoading}
    >
      {label || "Copy"}
    </Button>
  );
}
