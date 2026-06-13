const PASSWORD_KEY = "sales-portal:onboarding-passwords";

export type OnboardingPasswords = {
  currentPassword: string;
  newPassword: string;
};

export function saveOnboardingPasswords(passwords: OnboardingPasswords): void {
  sessionStorage.setItem(PASSWORD_KEY, JSON.stringify(passwords));
}

export function loadOnboardingPasswords(): OnboardingPasswords | null {
  const raw = sessionStorage.getItem(PASSWORD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OnboardingPasswords;
  } catch {
    return null;
  }
}

export function clearOnboardingPasswords(): void {
  sessionStorage.removeItem(PASSWORD_KEY);
}
