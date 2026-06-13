import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth-middleware";

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
