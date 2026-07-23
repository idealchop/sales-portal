import { LoginPage } from "@/features/auth/components/login-page";

/** Always fresh document — avoid CDN-cached HTML pointing at deleted chunks. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <LoginPage />;
}
