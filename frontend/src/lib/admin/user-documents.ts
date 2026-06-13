export type UserFirestoreDocumentRow = {
  path: string;
  collectionId: string;
  documentId: string;
  label: string;
  isRoot: boolean;
  data: Record<string, unknown>;
};

export function userDocumentTitle(row: UserFirestoreDocumentRow): string {
  if (row.isRoot) return "DOC: ROOT";
  return `DOC: ${row.label}`;
}

export function userDocumentPreview(row: UserFirestoreDocumentRow): string {
  return JSON.stringify({ ...row.data, _path: row.path }, null, 2);
}

export function describeUserDocumentDelete(row: UserFirestoreDocumentRow): {
  title: string;
  summary: string;
  items: Array<{ label: string; detail?: string }>;
} {
  const dataKeys = Object.keys(row.data);
  const previewFields = dataKeys.slice(0, 6);

  return {
    title: `Delete ${userDocumentTitle(row)}?`,
    summary:
      "This permanently removes the Firestore document below. This cannot be undone.",
    items: [
      {
        label: "Document path",
        detail: row.path,
      },
      {
        label: "Collection",
        detail: `${row.collectionId}/${row.documentId}`,
      },
      {
        label: "Fields that will be lost",
        detail:
          previewFields.length > 0 ?
            previewFields.join(", ") +
            (dataKeys.length > previewFields.length ?
              ` (+${dataKeys.length - previewFields.length} more)`
            : "")
          : "Empty document",
      },
    ],
  };
}
