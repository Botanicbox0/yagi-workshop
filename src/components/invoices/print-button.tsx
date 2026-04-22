"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type Props = {
  label: string;
};

export function PrintButton({ label }: Props) {
  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
    >
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
