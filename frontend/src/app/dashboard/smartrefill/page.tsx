import { redirect } from "next/navigation";

/** Legacy path — SmartRefill ops lives at `/webapp/smartrefill`. */
export default function SmartRefillDashboardRedirectPage() {
  redirect("/webapp/smartrefill");
}
