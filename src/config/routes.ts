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
        path: "vision-mission",
        lazy: async () => ({ Component: (await import("@/pages/vision-mission")).default }),
      },
      {
        path: "faq",
        lazy: async () => ({ Component: (await import("@/pages/faq")).default }),
      },
      {
        path: "contact",
        lazy: async () => ({ Component: (await import("@/pages/contact")).default }),
      },
      {
        path: "privacy",
        lazy: async () => ({ Component: (await import("@/pages/privacy")).default }),
      },
      {
        path: "terms",
        lazy: async () => ({ Component: (await import("@/pages/terms")).default }),
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
  {
    path: "/dashboard",
    shouldRevalidate: ({ currentUrl, nextUrl, formMethod, defaultShouldRevalidate }) => !formMethod && currentUrl.pathname === nextUrl.pathname && currentUrl.search !== nextUrl.search ? false : defaultShouldRevalidate,
    HydrateFallback: Preloader,
    lazy: async () => {
      const page = await import("@/pages/dashboard");
      return { Component: page.default, ErrorBoundary: page.ErrorBoundary, loader: page.loader };
    },
  },
  {
    path: "/monitoring",
    HydrateFallback: Preloader,
    lazy: async () => {
      const dashboard = await import("@/pages/dashboard");
      const monitoring = await import("@/pages/monitoring");
      return { Component: monitoring.default, ErrorBoundary: monitoring.MonitoringErrorBoundary, loader: dashboard.loader };
    },
    children: [
      { index: true, lazy: async () => ({ Component: (await import("@/pages/monitoring")).OverviewPage }) },
      { path: "reports", lazy: async () => ({ Component: (await import("@/pages/monitoring")).ReportsPage }), children: [{ path: ":id", lazy: async () => ({ Component: (await import("@/pages/monitoring")).ReportDetailPage }) }] },
      { path: "cases", lazy: async () => ({ Component: (await import("@/pages/monitoring")).CasesPage }), children: [{ path: ":id", lazy: async () => ({ Component: (await import("@/pages/monitoring")).CaseDetailPage }) }] },
      { path: "operations", children: [
        { index: true, lazy: async () => { const [dashboard, monitoring] = await Promise.all([import("@/pages/dashboard"), import("@/pages/monitoring")]); return { Component: monitoring.OperationsPage, loader: dashboard.loader }; } },
        { path: "teams", lazy: async () => { const [dashboard, monitoring] = await Promise.all([import("@/pages/dashboard"), import("@/pages/monitoring")]); return { Component: monitoring.OperationsTeamsPage, loader: dashboard.loader }; } },
        { path: "equipment", lazy: async () => { const [dashboard, monitoring] = await Promise.all([import("@/pages/dashboard"), import("@/pages/monitoring")]); return { Component: monitoring.OperationsEquipmentPage, loader: dashboard.loader }; } },
        { path: "assignments", lazy: async () => { const [dashboard, monitoring] = await Promise.all([import("@/pages/dashboard"), import("@/pages/monitoring")]); return { Component: monitoring.OperationsAssignmentsPage, loader: dashboard.loader }; } },
        { path: "access-water", lazy: async () => { const [dashboard, monitoring] = await Promise.all([import("@/pages/dashboard"), import("@/pages/monitoring")]); return { Component: monitoring.OperationsAccessWaterPage, loader: dashboard.loader }; } },
      ] },
      { path: "users", lazy: async () => ({ Component: (await import("@/pages/monitoring")).UsersPage }), children: [{ path: ":id", lazy: async () => ({ Component: (await import("@/pages/monitoring")).UserDetailPage }) }] },
    ],
  },
  {
    path: "/publications/:slug",
    HydrateFallback: Preloader,
    lazy: async () => {
      const { loader, ErrorBoundary } = await import("@/pages/dashboard");
      return { Component: (await import("@/pages/dashboard/components/PublicationPage")).default, loader, ErrorBoundary };
    },
  },
  { path: "/report", loader: ({ request }) => redirect(reportDestination(new URL(request.url).search)) },
  ...["/my-reports", "/my-reports/:id", "/feed", "/news"].map((path): RouteObject => ({
    path,
    loader: async args => {
      const { loader } = await import("@/pages/dashboard");
      const user = await loader(args);
      const home = workspacePath(user.role);
      if (path === "/news" && user.role === "ADMIN") return redirect(home);
      return redirect(path === "/news" ? `${home}?view=news` : path === "/feed" ? `${home}?view=feed` : `${home}?panel=my-reports${args.params.id ? `&report=${encodeURIComponent(args.params.id)}` : ""}`);
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
