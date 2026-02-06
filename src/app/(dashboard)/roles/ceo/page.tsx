import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { CEODashboardClient } from "./client";

export default async function CEODashboardPage() {
  const session = await auth();

  // Check access: only CEO role can access
  if (!session || session.user.role !== "ceo") {
    redirect("/");
  }

  return <CEODashboardClient />;
}
