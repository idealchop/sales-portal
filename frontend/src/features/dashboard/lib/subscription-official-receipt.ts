import { apiClient } from "@/lib/api-client";

export {
  subscriptionEligibleForOfficialReceipt,
  subscriptionHistoryHasStatementPayments,
} from "./subscription-official-receipt-eligibility";

async function openPdfBlob(blob: Blob, downloadName: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  printWindow.addEventListener("load", () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      /* popup may block print; PDF is still visible */
    }
  });
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

/** Downloads a single-period Official Receipt PDF and opens print. */
export async function printSubscriptionOfficialReceipt(
  businessId: string,
  subscriptionId: string,
): Promise<void> {
  const blob = await apiClient.getBlob(
    `/dashboard/subscriptions/${businessId}/${subscriptionId}/official-receipt`,
  );
  await openPdfBlob(blob, `SmartRefill-OR-${subscriptionId}.pdf`);
}

/** Downloads the full statement of account PDF and opens print. */
export async function printSubscriptionStatement(
  businessId: string,
): Promise<void> {
  const blob = await apiClient.getBlob(
    `/dashboard/subscriptions/${businessId}/statement`,
  );
  await openPdfBlob(blob, `SmartRefill-SOA-${businessId}.pdf`);
}
