import { Suspense } from "react";
import { ProposalWizardPage } from "@/features/proposals/components/proposal-wizard-page";

function WizardFallback() {
  return (
    <div className="mx-auto max-w-3xl p-6 text-sm text-[var(--muted-foreground)]">
      Loading proposal wizard…
    </div>
  );
}

export default function NewProposalPage() {
  return (
    <Suspense fallback={<WizardFallback />}>
      <ProposalWizardPage />
    </Suspense>
  );
}
