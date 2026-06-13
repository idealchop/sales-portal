import type { DecodedIdToken } from "firebase-admin/auth";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { validateSalesPortalAccess, SALES_PORTAL_APP_ID } from "../services/sales-portal-access";
import { writeUserLoginEvent } from "../services/auth/session-activity-service";
import { db } from "../config/firebase-admin";
import { logger } from "firebase-functions";

type RequestWithDecoded = AuthenticatedRequest & {
  decoded?: DecodedIdToken;
};

export const getAuthStatus = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const access = await validateSalesPortalAccess(uid);
  if (!access.allowed) {
    res.status(403).json({
      error: access.reason,
      code: access.code,
    });
    return;
  }

  const salesSnap = await db.collection("sales").doc(uid).get();
  const salesProfile = salesSnap.exists ? salesSnap.data() : null;

  res.json({
    data: {
      uid,
      role: access.role,
      roleAssigned: access.roleAssigned,
      email: access.email,
      displayName: access.displayName || salesProfile?.displayName,
      onboardingComplete: access.onboardingComplete,
      requiresPasswordChange: access.requiresPasswordChange,
      hasSalesProfile: salesSnap.exists,
      userProfile: access.userProfile,
      salesProfile: salesProfile ?
        {
          displayName: salesProfile.displayName,
          phone: salesProfile.phone,
          birthday: salesProfile.birthday,
          photoURL: salesProfile.photoURL,
          team: salesProfile.team,
          location: salesProfile.location,
        } :
        null,
    },
  });
};

export const recordLoginEvent = async (req: Request, res: Response) => {
  const authReq = req as RequestWithDecoded;
  const user = authReq.user;
  const decoded = authReq.decoded;
  const uid = user?.uid;

  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rawAppId = (req.body as { appId?: unknown })?.appId;
  const appId =
    typeof rawAppId === "string" && rawAppId.length > 0 && rawAppId.length <= 64 ?
      rawAppId :
      SALES_PORTAL_APP_ID;

  try {
    const access = await validateSalesPortalAccess(uid);
    if (!access.allowed) {
      res.status(403).json({
        error: access.reason,
        code: access.code,
      });
      return;
    }

    const recorded = await writeUserLoginEvent({
      uid,
      email: user.email,
      decoded: decoded ?? null,
      req,
      kind: "explicit_login",
      provider: decoded?.firebase?.sign_in_provider,
      appId,
    });

    if (recorded) {
      logger.info(`Recorded explicit login event for user ${uid}`);
    }

    res.json({ success: true, message: "Login event recorded", recorded });
  } catch (error: unknown) {
    logger.error(`Failed to record login event for ${uid}:`, error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
