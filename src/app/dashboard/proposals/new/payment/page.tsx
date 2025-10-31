
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

const billingCycles = [
  {
    cycle: 'Monthly',
    frequency: 'Pay every month',
    benefits: 'Standard plan benefits and monthly roll-over',
  },
  {
    cycle: 'Quarterly (every 3 months)',
    frequency: 'Prepaid every quarter',
    benefits: '3% discount on total plan cost',
  },
  {
    cycle: 'Semi-Annual (every 6 months)',
    frequency: 'Prepaid every 6 months',
    benefits: '5% discount + extended roll-over to 3 months',
  },
  {
    cycle: 'Annual (12 months)',
    frequency: 'Prepaid annually',
    benefits: '10% discount + free dispenser servicing + priority delivery scheduling',
  },
];

export default function PaymentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Options & Benefits</h1>
          <p className="text-muted-foreground">
            Step 3: Choose a Billing Cycle
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/proposals/new/plans">Previous</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/proposals/new/contract">Next Step</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Flexible Payment Schedules</CardTitle>
          <CardDescription>
            Smart Refill™ offers flexible payment schedules designed to accommodate businesses of all sizes, helping clients manage their operational budgets efficiently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Payment Frequency</TableHead>
                <TableHead>Benefits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingCycles.map((option) => (
                <TableRow key={option.cycle}>
                  <TableCell className="font-medium">{option.cycle}</TableCell>
                  <TableCell>{option.frequency}</TableCell>
                  <TableCell>{option.benefits}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Additional Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Clients may change their billing cycle upon renewal by notifying Smart Refill™ at least 15 days before the next billing period.</p>
                <p>All payments are prepaid and non-refundable once activated.</p>
                <p>Unused liters roll over according to the selected plan’s policy.</p>
                <p>Any unpaid add-on liters or rentals will be billed separately in the next cycle.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Accepted Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Bank Transfer (BPI, BDO, UnionBank)</p>
                <p>GCash or Maya</p>
                <p>Debit/Credit Card via the Smart Refill™ Platform</p>
                <p>Corporate Billing (available for Enterprise+ clients only)</p>
                <p className="pt-4 font-semibold text-foreground">All payments must be made in Philippine Pesos (₱) and confirmed before deliveries continue or new allocations are released.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
