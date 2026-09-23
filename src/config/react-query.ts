import { MutationCache, QueryClient } from "@tanstack/react-query";
import { notifyToast, safeMutationError } from "@/components/ui/toast";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnWindowFocus: true, refetchIntervalInBackground: false } },
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _result, mutation) => {
      const title = typeof mutation.meta?.successMessage === "string" ? mutation.meta.successMessage : "Change saved";
      notifyToast({ title, tone: "success" });
    },
    onError: (_error, _variables, _result, mutation) => {
      const title = typeof mutation.meta?.errorMessage === "string" ? mutation.meta.errorMessage : "Change not saved";
      notifyToast({ title, description: safeMutationError(), tone: "error" });
    },
  }),
});
