import { redirect, type LoaderFunctionArgs } from "react-router-dom";
import { accountQueryOptions } from "@/api/dashboard";
import { AuthError } from "@/lib";
import { workspacePath } from "@/lib/dashboard";
import { clearDashboardQueries } from "@/hooks/dashboard";
import { queryClient } from "@/config/react-query";
import { queryKeys } from "@/api/queryKeys";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await queryClient.fetchQuery(accountQueryOptions);
    if (!user) throw new AuthError("SESSION_REQUIRED", 401);
    request.signal.throwIfAborted();
    if (queryClient.getQueriesData({ queryKey: queryKeys.dashboard.all }).some(([key]) => key[1] !== user.id || key[2] !== user.role)) clearDashboardQueries();
    const url = new URL(request.url);
    if (url.pathname === "/monitoring" && user.role !== "ADMIN") throw redirect("/dashboard");
    if (user.role === "ADMIN" && (url.pathname === "/report" || url.pathname.startsWith("/my-reports") || ["report", "my-reports"].includes(url.searchParams.get("panel") ?? ""))) throw redirect(workspacePath(user.role));
    return user;
  } catch (error) {
    request.signal.throwIfAborted();
    if (error instanceof Response && error.status === 302) throw error;
    clearDashboardQueries();
    if (error instanceof AuthError && (error.status === 401 || error.code === "EMAIL_NOT_VERIFIED")) {
      throw redirect(`/login?next=${encodeURIComponent(new URL(request.url).pathname + new URL(request.url).search)}`);
    }
    throw new Response("Session check unavailable", { status: 503 });
  }
}
