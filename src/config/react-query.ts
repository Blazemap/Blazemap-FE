import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnWindowFocus: true, refetchIntervalInBackground: false } },
});
