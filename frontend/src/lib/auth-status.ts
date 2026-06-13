import { apiClient } from "@/lib/api-client";

export type SalesPortalRole = "sales" | "manager" | "admin";
export type SelfSelectableRole = "sales" | "manager";

export type UserProfile = {
  displayName?: string;
  phone?: string;
  birthday?: string;
  photoURL?: string | null;
  email?: string;
};

export type AuthStatus = {
  uid: string;
  role: SalesPortalRole | null;
  roleAssigned: boolean;
  email?: string;
  displayName?: string;
  onboardingComplete: boolean;
  requiresPasswordChange: boolean;
  hasSalesProfile: boolean;
  userProfile?: UserProfile;
  salesProfile?: {
    displayName?: string;
    phone?: string;
    birthday?: string;
    photoURL?: string | null;
    team?: string;
    location?: string;
  } | null;
};

export type AuthStatusResponse = {
  data: AuthStatus;
};

export const SALES_PORTAL_APP_ID = "sales-portal";

export function resolvePostLoginPath(
  status: AuthStatus,
): "/dashboard" | "/onboarding" {
  return status.onboardingComplete ? "/dashboard" : "/onboarding";
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await apiClient.get<AuthStatusResponse>("/auth/status");
  return response.data;
}

export async function recordLoginEvent(): Promise<void> {
  await apiClient.post("/auth/login", { appId: SALES_PORTAL_APP_ID });
}

export function roleLabel(role: SalesPortalRole | null): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "manager":
      return "Sales Manager";
    case "sales":
      return "Sales Executive";
    default:
      return "Not selected";
  }
}
