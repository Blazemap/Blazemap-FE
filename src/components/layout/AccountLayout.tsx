import { useLoaderData } from "react-router-dom";
import MainLayout from "./MainLayout";
import type { DashboardUser } from "@/types";

export default function AccountLayout() {
  const user = useLoaderData() as DashboardUser;
  return <MainLayout accountUser={user} />;
}
