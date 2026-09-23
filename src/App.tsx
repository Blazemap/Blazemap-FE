import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { routes } from "@/config/routes";
import { queryClient } from "@/config/react-query";
import { ToastProvider } from "@/components/ui";

const router = createBrowserRouter(routes);

export default function App() {
  return <QueryClientProvider client={queryClient}><ToastProvider><RouterProvider router={router} /></ToastProvider></QueryClientProvider>;
}
