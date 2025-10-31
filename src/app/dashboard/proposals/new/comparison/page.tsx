
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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

export default function ComparisonPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Refill vs. Traditional</h1>
          <p className="text-muted-foreground">
            Step 3: The Smart Refill Advantage
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

      <Card>
        <CardHeader>
          <CardTitle>💎 Smart Refill vs. Traditional Per-Bottle Pricing</CardTitle>
          <CardDescription>
            Here's how Smart Refill provides a competitive advantage over traditional water suppliers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Aspect</TableHead>
                <TableHead>Traditional Per-Bottle Model</TableHead>
                <TableHead>Smart Refill Hybrid Subscription Model</TableHead>
                <TableHead className="font-bold">Your Competitive Advantage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((row) => (
                <TableRow key={row.aspect}>
                  <TableCell className="font-semibold">{row.aspect}</TableCell>
                  <TableCell>{row.traditional}</TableCell>
                  <TableCell>{row.smartRefill}</TableCell>
                  <TableCell>{row.advantage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
