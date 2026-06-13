import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { db, FieldValue } from "../config/firebase-admin";
import {
  extractRiverUserProfile,
  markSalesPortalOnboardingComplete,
  resolveOnboardingRole,
  type SalesPortalRole,
} from "../services/sales-portal-access";
import { uploadUserAvatar } from "../services/avatar-upload-service";

type CompleteOnboardingBody = {
  displayName?: string;
  phone?: string;
  birthday?: string;
  photoURL?: string | null;
  team?: string;
  location?: string;
  role?: string;
};

type UploadAvatarBody = {
  fileName?: string;
  contentType?: string;
  data?: string;
};

export const uploadOnboardingAvatar = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as UploadAvatarBody;
  if (!body.data || typeof body.data !== "string") {
    res.status(400).json({ error: "Avatar data is required." });
    return;
  }

  try {
    const buffer = Buffer.from(body.data, "base64");
    const photoURL = await uploadUserAvatar({
      uid,
      fileName: body.fileName || "avatar.jpg",
      contentType: body.contentType || "image/jpeg",
      buffer,
    });

    res.json({ data: { photoURL } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "FILE_TOO_LARGE") {
      res.status(400).json({ error: "Image must be 5 MB or smaller." });
      return;
    }
    if (message === "EMPTY_FILE") {
      res.status(400).json({ error: "The selected image is empty." });
      return;
    }
    res.status(500).json({ error: "Failed to upload avatar. Please try again." });
  }
};

export const getOnboardingManagers = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const snap = await db.collection("sales").where("role", "==", "manager").get();
  const managers = snap.docs
    .map((doc) => {
      const data = doc.data();
      if (!data.location || !data.displayName) return null;
      return {
        id: doc.id,
        displayName: String(data.displayName),
        location: String(data.location),
        teamLabel: `${data.location} (${data.displayName})`,
      };
    })
    .filter(Boolean);

  const locations = Array.from(
    new Set(
      managers
        .map((m) => m?.location)
        .filter((l): l is string => typeof l === "string" && l.length > 0),
    ),
  ).sort();

  res.json({ data: { managers, locations } });
};

export const completeOnboarding = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const roleResult = await resolveOnboardingRole(uid, req.body?.role);
  if (!roleResult.ok) {
    res.status(roleResult.status).json({ error: roleResult.error });
    return;
  }

  const role: SalesPortalRole = roleResult.role;
  const body = req.body as CompleteOnboardingBody;
  const displayName = body.displayName?.trim();
  const phone = body.phone?.trim();
  const birthday = body.birthday?.trim();

  if (!displayName || !phone || !birthday) {
    res.status(400).json({ error: "displayName, phone, and birthday are required." });
    return;
  }

  const team = body.team?.trim();
  const location = body.location?.trim();

  if (role === "sales" && !team) {
    res.status(400).json({ error: "Team is required for sales executives." });
    return;
  }

  if (role === "manager" && !location) {
    res.status(400).json({ error: "Location is required for sales managers." });
    return;
  }

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const existingUser = userSnap.data() ?? {};
  const existingProfile = extractRiverUserProfile(existingUser);

  const userUpdates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (displayName !== existingProfile.displayName) {
    userUpdates.displayName = displayName;
  }
  if (phone !== existingProfile.phone) {
    userUpdates.phone = phone;
  }
  if (birthday !== existingProfile.birthday) {
    userUpdates.birthday = birthday;
  }
  const nextPhotoURL = body.photoURL ?? null;
  if (nextPhotoURL !== (existingProfile.photoURL ?? null)) {
    userUpdates.photoURL = nextPhotoURL;
  }

  if (Object.keys(userUpdates).length > 1) {
    await userRef.set(userUpdates, { merge: true });
  }

  const salesProfile: Record<string, unknown> = {
    id: uid,
    email: req.user?.email || existingProfile.email || null,
    displayName,
    phone,
    birthday,
    photoURL: nextPhotoURL,
    role,
    onboardingCompleted: true,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (role === "sales" && team) {
    salesProfile.team = team;
  }
  if (role === "manager" && location) {
    salesProfile.location = location;
  }

  const salesRef = db.collection("sales").doc(uid);
  const salesSnap = await salesRef.get();
  if (!salesSnap.exists) {
    salesProfile.createdAt = FieldValue.serverTimestamp();
  }

  await salesRef.set(salesProfile, { merge: true });
  await markSalesPortalOnboardingComplete(uid, {
    role: roleResult.role,
  });

  res.json({
    success: true,
    data: {
      onboardingComplete: true,
      role,
    },
  });
};
