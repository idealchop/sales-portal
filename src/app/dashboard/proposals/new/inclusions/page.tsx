
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Computer,
    CalendarClock,
    RotateCw,
    AreaChart,
    Thermometer,
    Wrench,
    CircleHelp,
    Rocket,
    Phone,
    Building2,
} from 'lucide-react';

const inclusions = [
    {
        icon: <Computer className="h-5 w-5 text-primary" />,
        title: 'Smart Client Portal',
        description: 'Monitor consumption, providers, deliveries, and payments in real time.',
    },
    {
        icon: <CalendarClock className="h-5 w-5 text-primary" />,
        title: 'Automated Scheduling & Delivery',
        description: 'No manual ordering; Smart Refill handles refills automatically.',
    },
    {
        icon: <RotateCw className="h-5 w-5 text-primary" />,
        title: 'Roll-Over Liters',
        description: 'Unused liters carry over to the next cycle.',
    },
    {
        icon: <AreaChart className="h-5 w-5 text-primary" />,
        title: 'Transparent Tracking',
        description: 'Full visibility for operations and accounting.',
    },
    {
        icon: <Thermometer className="h-5 w-5 text-primary" />,
        title: 'Free Dispensers, Bottles & Sanitary Items',
        description: 'Included based on your plan.',
    },
    {
        icon: <Wrench className="h-5 w-5 text-primary" />,
        title: 'Monthly Sanitation Visit',
        description: 'Regular cleaning and compliance check for your dispensers.',
    },
    {
        icon: <CircleHelp className="h-5 w-5 text-primary" />,
        title: 'Guaranteed Water Compliance',
        description: 'All partner stations meet strict sanitation and quality standards.',
    },
    {
        icon: <Phone className="h-5 w-5 text-primary" />,
        title: 'Customer Support',
        description: 'Assistance available for any service or delivery concerns.',
    },
    {
        icon: <Rocket className="h-5 w-5 text-primary" />,
        title: 'Custom & Scalable Plans',
        description: 'Adjust liters, branches, and schedules as your business grows.',
    },
];

const addons = [
  {
    id: 'express-delivery',
    name: 'Express Delivery Upgrade',
    description: 'Priority delivery during peak hours for uninterrupted operations',
    fee: '₱500 / month',
  },
  {
    id: 'emergency-support',
    name: '24/7 Emergency Support',
    description: 'On-call assistance for urgent refills or technical issues',
    fee: '₱750 / month',
  },
  {
    id: 'multi-location',
    name: 'Multi-Location Coordination',
    description: 'Centralized scheduling, billing, and delivery management for multiple branches',
    fee: 'Custom',
  },
];

export default function InclusionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Details</h1>
          <p className="text-muted-foreground">
            Step 3: Review Inclusions & Select Add-ons
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/proposals/new/plans">Previous</Link>
          </Button>
          <Button>Next Step</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Included in Every Plan</CardTitle>
            <CardDescription>
                Smart Refill gives your business a complete, automated water operations system — designed for convenience, compliance, and continuous supply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inclusions.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div>{item.icon}</div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optional Add-Ons</CardTitle>
            <CardDescription>
              Enhance your Smart Refill experience with premium service options designed to make water operations even faster, safer, and more efficient.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Add-On</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Monthly Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>
                      <Checkbox id={addon.id} />
                    </TableCell>
                    <TableCell>
                      <Label htmlFor={addon.id} className="font-semibold">{addon.name}</Label>
                    </TableCell>
                    <TableCell>{addon.description}</TableCell>
                    <TableCell className="text-right">{addon.fee}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
