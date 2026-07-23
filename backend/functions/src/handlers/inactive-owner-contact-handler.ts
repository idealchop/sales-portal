import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth-middleware";
import { setInactiveOwnerContactedAt } from "../services/inactive-owner-contacts-service";

export async function patchInactiveOwnerContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const businessId = String(req.params.businessId || "").trim();
  if (!businessId) {
    res.status(400).json({ error: "Business id is required." });
    return;
  }

  try {
    const data = await setInactiveOwnerContactedAt({
      businessId,
      actorUid: uid,
    });
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Failed to record inactive owner contact." });
  }
}
