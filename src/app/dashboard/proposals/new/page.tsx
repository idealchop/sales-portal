import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProposalForm } from '@/components/proposal-form';
import { clients } from '@/lib/data';

export default async function NewProposalPage() {
  // In a real app, you'd fetch this data from your database
  const availableClients = clients;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/proposals">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Proposals
            </Link>
        </Button>
      </div>
      <ProposalForm clients={availableClients} />
    </div>
  );
}
