import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { PurchasingDashboardClient } from "./client";

export default async function PurchasingDashboardPage() {
  const session = await auth();

  // Check access: purchasing or ceo can access
  if (!session || !["purchasing", "ceo"].includes(session.user.role)) {
    redirect("/");
  }

  return <PurchasingDashboardClient />;
}
