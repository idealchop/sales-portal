import { apiClient } from "./api-client";

export type OnboardingManager = {
  id: string;
  displayName: string;
  location: string;
  teamLabel: string;
};

export type CompleteOnboardingPayload = {
  displayName: string;
  phone: string;
  birthday: string;
  photoURL?: string | null;
  team?: string;
  location?: string;
  role?: "sales" | "manager";
};

export async function fetchOnboardingManagers(): Promise<{
  managers: OnboardingManager[];
  locations: string[];
}> {
  const response = await apiClient.get<{
    data: { managers: OnboardingManager[]; locations: string[] };
  }>("/onboarding/managers");
  return response.data;
}

export async function completeOnboarding(
  payload: CompleteOnboardingPayload,
): Promise<void> {
  await apiClient.post("/onboarding/complete", payload);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read image file."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to read image file."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadOnboardingAvatar(file: File): Promise<string> {
  const data = await fileToBase64(file);
  const response = await apiClient.post<{ data: { photoURL: string } }>(
    "/onboarding/avatar",
    {
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      data,
    },
  );
  return response.data.photoURL;
}
