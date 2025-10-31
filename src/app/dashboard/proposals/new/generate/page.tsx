
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProposalForm } from '@/components/proposal-form';
import { clients } from '@/lib/data';

export default function GenerateProposalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Generate Proposal</h1>
          <p className="text-muted-foreground">
            Step 5: Review Details and Generate AI-Powered Draft
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/proposals/new/payment">Previous</Link>
          </Button>
        </div>
      </div>

      <ProposalForm clients={clients} />
    </div>
  );
}
