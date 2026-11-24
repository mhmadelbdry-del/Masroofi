import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { StartupProvider } from "./startup-loading";
import { ThemeProvider } from "./theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 4000 },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <StartupProvider><ThemeProvider>{children}</ThemeProvider></StartupProvider>
      <Toaster
        dir="rtl"
        position="top-center"
        toastOptions={{
          className: "font-sans",
        }}
      />
    </QueryClientProvider>
  );
}
