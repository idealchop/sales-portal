import { redirect } from "next/navigation";

/** Legacy path — action board lives at `/dashboard`. */
export default function SalesPortalDashboardRedirectPage() {
  redirect("/dashboard");
}
