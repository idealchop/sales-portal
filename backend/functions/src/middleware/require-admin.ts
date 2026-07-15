import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth-middleware";

/** Admin-only gate (catalog, permissions, destructive platform ops). */
export const requireAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as AuthenticatedRequest).user;
  if (user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
};

/** Manager or admin — Resources CMS (blogs, videos, webinars). */
export const requireManagerOrAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const role = (req as AuthenticatedRequest).user?.role;
  if (role !== "admin" && role !== "manager") {
    res.status(403).json({ error: "Manager or admin access required." });
    return;
  }
  next();
};
