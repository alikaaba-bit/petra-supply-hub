import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { SalesDashboardClient } from "./client";

export default async function SalesDashboardPage() {
  const session = await auth();

  // Check access: sales or ceo can access
  if (!session || !["sales", "ceo"].includes(session.user.role)) {
    redirect("/");
  }

  return <SalesDashboardClient />;
}
