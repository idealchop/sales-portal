import { Request, Response, NextFunction } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { logger } from "firebase-functions";
import { auth } from "../config/firebase-admin";
import { validateSalesPortalAccess } from "../services/sales-portal-access";
import { scheduleApiSessionAccessRecord } from "../services/auth/session-activity-service";

export type AuthenticatedRequest = Request & {
  user?: {
    uid: string;
    email?: string;
    role?: string | null;
    roleAssigned?: boolean;
  };
};

export const validateFirebaseIdToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith("Bearer ")
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const idToken = req.headers.authorization.split("Bearer ")[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);
    (req as AuthenticatedRequest).user = {
      uid: decoded.uid,
      email: decoded.email,
    };
    (req as Request & { decoded?: DecodedIdToken }).decoded = decoded;
    scheduleApiSessionAccessRecord(decoded, req);
    next();
  } catch (error) {
    logger.warn("verifyIdToken failed", { path: req.path, error });
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireSalesPortalAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user?.uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const access = await validateSalesPortalAccess(user.uid);
  if (!access.allowed) {
    res.status(403).json({
      error: access.reason,
      code: access.code,
    });
    return;
  }

  (req as AuthenticatedRequest).user = {
    ...user,
    role: access.role,
    roleAssigned: access.roleAssigned,
    email: access.email ?? user.email,
  };
  next();
};
