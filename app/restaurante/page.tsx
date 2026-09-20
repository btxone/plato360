import { headers } from "next/headers";
import { redirect } from "next/navigation";
import RestaurantDashboard from "@/components/RestaurantDashboard";
import { isAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function RestaurantPage() {
  const requestHeaders = await headers();
  if (!(await isAdminSession(requestHeaders.get("cookie")))) redirect("/restaurante/login");
  return <RestaurantDashboard />;
}

