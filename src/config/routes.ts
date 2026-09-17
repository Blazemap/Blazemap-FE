import { redirect, type RouteObject } from "react-router-dom";
import { reportDestination, workspacePath } from "@/lib/dashboard";
import MainLayout from "@/components/layout/MainLayout";
import { Preloader } from "@/components/common";
import NotFoundPage from "@/pages/not-found";

export const routes: RouteObject[] = [
  {
    path: "/",
    Component: MainLayout,
    HydrateFallback: Preloader,
    ErrorBoundary: NotFoundPage,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("@/pages/home")).default }),
      },
      {
        path: "contact",
        lazy: async () => ({ Component: (await import("@/pages/contact")).default }),
      },
    ],
  },
  {
    lazy: async () => ({ Component: (await import("@/components/layout/AuthLayout")).default }),
    HydrateFallback: Preloader,
    ErrorBoundary: NotFoundPage,
    children: [
      {
        path: "/login",
        lazy: async () => ({ Component: (await import("@/pages/login")).default }),
      },
      {
        path: "/register",
        lazy: async () => ({ Component: (await import("@/pages/register")).default }),
      },
    ],
  },
  ...["/dashboard", "/monitoring"].map((path): RouteObject => ({
    path,
    shouldRevalidate: ({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) => !formMethod && currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search ? false : defaultShouldRevalidate,
    HydrateFallback: Preloader,
    lazy: async () => {
      const page = await import("@/pages/dashboard");
      return { Component: page.default, ErrorBoundary: page.ErrorBoundary, loader: page.loader };
    },
  })),
  { path: "/report", loader: ({ request }) => redirect(reportDestination(new URL(request.url).search)) },
  ...["/my-reports", "/my-reports/:id", "/feed"].map((path): RouteObject => ({
    path,
    loader: async args => {
      const { loader } = await import("@/pages/dashboard");
      const user = await loader(args);
      const home = workspacePath(user.role);
      return redirect(path === "/feed" ? `${home}?view=feed` : `${home}?panel=my-reports${args.params.id ? `&report=${encodeURIComponent(args.params.id)}` : ""}`);
    },
  })),
  ...["/account", "/profile"].map((path): RouteObject => ({
    path,
    HydrateFallback: Preloader,
    lazy: async () => {
      const { loader, ErrorBoundary } = await import("@/pages/dashboard");
      const layout = await import("@/components/layout/AccountLayout");
      return { Component: layout.default, loader, ErrorBoundary };
    },
    children: [{ index: true, lazy: async () => ({ Component: (await import("@/pages/profile")).default }) }],
  })),
  { path: "*", Component: NotFoundPage },
];
