/** Seeded by backend/seed-emulator.js — keep in sync. */
export const TEST_PASSWORD = "SalesPortalTest1!";

export const TEST_SALES_USER = {
  uid: "sp-test-sales-001",
  email: "sales.portal.test@example.com",
  role: "sales" as const,
};

export const TEST_MANAGER_USER = {
  uid: "sp-test-manager-001",
  email: "manager.portal.test@example.com",
  role: "manager" as const,
};

export const TEST_ADMIN_USER = {
  uid: "sp-test-admin-001",
  email: "admin.portal.test@example.com",
  role: "admin" as const,
};

const AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

/** Exchange email/password for an ID token against the Auth emulator. */
export async function fetchEmulatorIdToken(
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const url = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth emulator sign-in failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { idToken?: string };
  if (!json.idToken) {
    throw new Error("Auth emulator response missing idToken");
  }

  return json.idToken;
}
