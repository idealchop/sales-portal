import type { FirebaseApp } from "firebase/app";
import {
  type AppCheck,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";

let appCheckInstance: AppCheck | null = null;

function shouldUseDebugToken(): boolean {
  return (
    process.env.NEXT_PUBLIC_DEV === "true" ||
    process.env.NODE_ENV === "development"
  );
}

export function initAppCheck(app: FirebaseApp): AppCheck | null {
  if (typeof window === "undefined" || appCheckInstance) {
    return appCheckInstance;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (!siteKey) {
    console.warn(
      "[App Check] Skipped — set NEXT_PUBLIC_RECAPTCHA_SITE_KEY to enable.",
    );
    return null;
  }

  const debugToken = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN?.trim();
  if (shouldUseDebugToken() && debugToken) {
    (
      globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
      }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });

  return appCheckInstance;
}

export async function getAppCheckToken(
  forceRefresh = false,
): Promise<string | null> {
  if (!appCheckInstance) return null;

  try {
    const { token } = await getToken(appCheckInstance, forceRefresh);
    return token;
  } catch {
    return null;
  }
}
