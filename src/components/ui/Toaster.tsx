"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors={false}
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "app-toast",
          title: "app-toast__title",
          description: "app-toast__desc",
          success: "app-toast--success",
          error: "app-toast--error",
          closeButton: "app-toast__close",
        },
      }}
    />
  );
}
