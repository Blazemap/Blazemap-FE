import type { RouteObject } from "react-router-dom";
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
  { path: "*", Component: NotFoundPage },
];
