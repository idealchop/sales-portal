
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const comparisonData = [
  {
    aspect: 'Pricing Structure',
    traditional: 'Pay per 5-gallon bottle (₱50–₱70 each). Cost fluctuates based on delivery frequency.',
    smartRefill: 'Pay a fixed monthly fee based on liters (₱1.90–₱2.50/L), predictable and budget-friendly.',
    advantage: '🧾 Predictable billing — easier budgeting for clients.',
  },
  {
    aspect: 'Ordering Process',
    traditional: 'Manual ordering by call or text. Risk of running out or delayed refills.',
    smartRefill: 'Automated scheduling and refill tracking through the app.',
    advantage: '⚙️ No manual ordering — 100% automated and smart delivery.',
  },
  {
    aspect: 'Monitoring Usage',
    traditional: 'No tracking. Businesses often overorder or underorder.',
    smartRefill: 'Real-time monitoring of liters used and refills made.',
    advantage: '📊 Transparent usage data for accounting and cost optimization.',
  },
  {
    aspect: 'Wastage',
    traditional: 'Bottles sometimes unused, misplaced, or lost.',
    smartRefill: 'Liter-based tracking + roll-over feature (2 months).',
    advantage: '🔄 No wastage — unused liters are saved.',
  },
  {
    aspect: 'Dispenser & Bottle Fees',
    traditional: 'Usually charged or rented separately.',
    smartRefill: 'Free dispensers and bottles in select plans.',
    advantage: '🧴 Cost savings + convenience.',
  },
  {
    aspect: 'Scalability',
    traditional: 'Hard to manage for multiple branches.',
    smartRefill: 'Centralized control for all locations via one dashboard.',
    advantage: '🌐 Multi-site management for enterprises.',
  },
  {
    aspect: 'Water Quality & Compliance',
    traditional: 'Quality varies per supplier. No digital record.',
    smartRefill: 'Monitored through Client Portal',
    advantage: '💧 Verified water sources with digital compliance record.',
  },
  {
    aspect: 'Customer Experience',
    traditional: 'Reactive and inconsistent service.',
    smartRefill: 'Automated, proactive, and data-driven service.',
    advantage: '🚀 Modern and hassle-free experience.',
  },
];

function ComparisonCard({ aspect, traditional, smartRefill, advantage }: { aspect: string, traditional: string, smartRefill: string, advantage: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{aspect}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Traditional Model</h4>
                    <p className="text-sm">{traditional}</p>
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold text-sm text-primary">Smart Refill Model</h4>
                    <p className="text-sm">{smartRefill}</p>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
                 <p className="text-sm font-semibold text-primary">{advantage}</p>
            </CardFooter>
        </Card>
    );
}

export default function ComparisonPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">The Smart Refill Advantage</h1>
          <p className="text-muted-foreground">
            Step 3: A clear comparison against the traditional model.
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new/about">Previous</Link>
            </Button>
            <Button asChild>
                <Link href="/dashboard/proposals/new/plans">Next Step</Link>
            </Button>
        </div>
      </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisonData.map((item) => (
                <ComparisonCard key={item.aspect} {...item} />
            ))}
       </div>
    </div>
  );
}
