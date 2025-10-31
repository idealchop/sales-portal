import { Badge } from '@/components/ui/badge';
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
import { commissions } from '@/lib/data';

const statusStyles: { [key: string]: string } = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

export default function CommissionsPage() {
  return (
    <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Commissions</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Commission History</CardTitle>
            <CardDescription>
              A record of all sales commissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">
                      {commission.salesRep}
                    </TableCell>
                    <TableCell>{commission.clientName}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${statusStyles[commission.status]}`} variant="outline">
                        {commission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {commission.date}
                    </TableCell>
                    <TableCell className="text-right">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(commission.commissionAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
