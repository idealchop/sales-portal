import { PublicProposalPage } from "@/features/proposals/components/public-proposal-page";

export default async function SharedProposalRoute({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = await params;
  return <PublicProposalPage linkId={linkId} />;
}
