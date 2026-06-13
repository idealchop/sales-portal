"use client";

import { useMemo } from "react";
import { UserLoginLogsDialog } from "@/features/admin/components/user-login-logs-dialog";
import { useAdminUserDocuments } from "@/hooks/use-admin-user-documents";
import {
  dataManagementUserLabel,
  type DataManagementLinkRow,
} from "@/lib/admin/data-management";
import {
  profileNameFromData,
  splitUserDocuments,
} from "@/lib/admin/user-profile-display";

export function DataManagementUserLogsDialog({
  row,
  onClose,
}: {
  row: DataManagementLinkRow;
  onClose: () => void;
}) {
  const uid = row.userId;
  const { documents, refresh } = useAdminUserDocuments(uid ?? null, Boolean(uid));

  const rootDoc = useMemo(
    () => documents.find((doc) => doc.isRoot) ?? null,
    [documents],
  );

  const loginEvents = useMemo(
    () => splitUserDocuments(documents).loginEvents,
    [documents],
  );

  const displayName =
    profileNameFromData(rootDoc?.data) || dataManagementUserLabel(row);

  if (!uid) return null;

  return (
    <UserLoginLogsDialog
      uid={uid}
      events={loginEvents}
      displayName={displayName}
      onClose={onClose}
      onDocumentsChanged={() => void refresh()}
    />
  );
}
