import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "@/config";

const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
