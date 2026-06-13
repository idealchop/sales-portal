"use client";

import { Building2, Pencil, RefreshCw, ScrollText, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataManagementNoBusinessDialog } from "@/features/admin/components/data-management-no-business-dialog";
import { DeleteFirestoreDocDialog } from "@/features/admin/components/delete-firestore-doc-dialog";
import { EditFirestoreDocDialog } from "@/features/admin/components/edit-firestore-doc-dialog";
import { UserLoginLogsDialog } from "@/features/admin/components/user-login-logs-dialog";
import { UserProfileCollectionView } from "@/features/admin/components/user-profile-collection-view";
import { useAdminUserDocuments } from "@/hooks/use-admin-user-documents";
import {
  dataManagementUserLabel,
  type DataManagementLinkRow,
} from "@/lib/admin/data-management";
import {
  profileNameFromData,
  profilePhotoFromData,
  splitUserDocuments,
} from "@/lib/admin/user-profile-display";
import {
  businessInfoPath,
  dataManagementPath,
  parseDataManagementSearchParams,
} from "@/lib/admin/data-management-url-state";
import type { UserFirestoreDocumentRow } from "@/lib/admin/user-documents";
import { cn } from "@/lib/utils";

type RoleTab = "owners" | "staff";

function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close photo"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-[min(90vw,36rem)] object-contain"
        />
      </div>
    </div>
  );
}

export function DataManagementUserDocsDialog({
  row,
  tab,
  onClose,
  onRemove,
}: {
  row: DataManagementLinkRow;
  tab: RoleTab;
  onClose: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = row.userId;
  const [photoEnlarged, setPhotoEnlarged] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [noBusinessOpen, setNoBusinessOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<UserFirestoreDocumentRow | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<UserFirestoreDocumentRow | null>(
    null,
  );

  const {
    documents,
    isLoading,
    error,
    refresh,
    saveDocument,
    removeDocument,
  } = useAdminUserDocuments(uid ?? null, Boolean(uid));

  const rootDoc = useMemo(
    () => documents.find((doc) => doc.isRoot) ?? null,
    [documents],
  );

  const loginEvents = useMemo(
    () => splitUserDocuments(documents).loginEvents,
    [documents],
  );

  useEffect(() => {
    if (!uid) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !editDoc &&
        !deleteDoc &&
        !photoEnlarged &&
        !logsOpen &&
        !noBusinessOpen
      ) {
        onClose();
      }
    };
    window.document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [uid, deleteDoc, editDoc, logsOpen, noBusinessOpen, onClose, photoEnlarged]);

  if (!uid) return null;

  const profilePhoto =
    row.userPhotoURL || profilePhotoFromData(rootDoc?.data) || undefined;
  const profileName =
    profileNameFromData(rootDoc?.data) || dataManagementUserLabel(row);
  const profileEmail =
    (typeof rootDoc?.data.email === "string" && rootDoc.data.email) ||
    row.userEmail;

  function handleViewBusinessInfo() {
    const returnTo = dataManagementPath(parseDataManagementSearchParams(searchParams));
    if (row.businessId) {
      router.push(businessInfoPath(row.businessId, returnTo, row.userId));
      return;
    }
    setNoBusinessOpen(true);
  }

  function handleEdit() {
    if (rootDoc) setEditDoc(rootDoc);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-profile-dialog-title"
          className="relative z-10 flex max-h-[94vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-zinc-200/80"
        >
          <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-6 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700/90">
                User management
              </p>
              <h2
                id="user-profile-dialog-title"
                className="mt-0.5 text-[1.35rem] font-semibold tracking-tight text-zinc-900"
              >
                Profile overview
              </h2>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                onClick={() => void refresh()}
                disabled={isLoading}
                aria-label="Refresh profile"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-800"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-6 py-6">
            <UserProfileCollectionView
              documents={documents}
              isLoading={isLoading}
              error={error}
              displayName={profileName}
              profilePhoto={profilePhoto}
              profileEmail={profileEmail}
              uid={uid}
              row={row}
              tab={tab}
              onPhotoClick={
                profilePhoto ? () => setPhotoEnlarged(true) : undefined
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
                onClick={() => setLogsOpen(true)}
              >
                <ScrollText className="mr-2 h-4 w-4 text-zinc-500" />
                Activity logs
                {loginEvents.length > 0 && (
                  <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                    {loginEvents.length}
                  </span>
                )}
              </Button>
              {tab === "owners" && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
                  onClick={handleViewBusinessInfo}
                >
                  <Building2 className="mr-2 h-4 w-4 text-zinc-500" />
                  View business info
                </Button>
              )}
              <span className="hidden text-xs text-zinc-400 sm:inline">
                Firestore profile · Auth unchanged
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
                onClick={handleEdit}
                disabled={!rootDoc}
              >
                <Pencil className="mr-2 h-4 w-4 text-zinc-500" />
                Edit profile
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50"
                onClick={onRemove}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>

      {photoEnlarged && profilePhoto && (
        <PhotoLightbox
          src={profilePhoto}
          alt={profileName}
          onClose={() => setPhotoEnlarged(false)}
        />
      )}

      {logsOpen && uid && (
        <UserLoginLogsDialog
          uid={uid}
          events={loginEvents}
          displayName={profileName}
          onClose={() => setLogsOpen(false)}
          onDocumentsChanged={() => void refresh()}
        />
      )}

      {noBusinessOpen && tab === "owners" && (
        <DataManagementNoBusinessDialog
          row={row}
          onClose={() => setNoBusinessOpen(false)}
        />
      )}

      {editDoc && (
        <EditFirestoreDocDialog
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (data) => {
            await saveDocument(editDoc.path, data);
          }}
        />
      )}

      {deleteDoc && (
        <DeleteFirestoreDocDialog
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={async () => {
            await removeDocument(deleteDoc.path);
          }}
        />
      )}
    </>
  );
}
