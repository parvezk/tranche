"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      toastOptions={{
        style: {
          background: "#18181b",
          border: "1px solid #1a1a1e",
          color: "#e4e4e7",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
