import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { WarehouseDashboardClient } from "./client";

export default async function WarehouseDashboardPage() {
  const session = await auth();

  // Check access: warehouse or ceo can access
  if (!session || !["warehouse", "ceo"].includes(session.user.role)) {
    redirect("/");
  }

  return <WarehouseDashboardClient />;
}
