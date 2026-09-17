import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { routes } from "@/config/routes";
import { queryClient } from "@/config/react-query";

const router = createBrowserRouter(routes);

export default function App() {
  return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
}
