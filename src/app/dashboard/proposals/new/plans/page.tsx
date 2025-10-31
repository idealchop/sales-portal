
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const plans = [
  {
    name: 'Micro',
    monthlyFee: '₱1,000',
    liters: '500 L',
    bottles: '≈ 26 bottles',
    rate: '₱2.50',
    idealFor: 'Small kiosks / home offices',
    inclusions: 'Free delivery; refill tracking via app',
    employees: '5 – 10',
    stations: '1 Station',
  },
  {
    name: 'Starter',
    monthlyFee: '₱2,000',
    liters: '1,000 L',
    bottles: '≈ 53 bottles',
    rate: '₱2.40',
    idealFor: 'Small offices / retail',
    inclusions: '+ 1 Free Dispenser; compliance monitoring',
    employees: '10 – 20',
    stations: '1 Station',
  },
  {
    name: 'Pro',
    monthlyFee: '₱7,500',
    liters: '5,000 L',
    bottles: '≈ 263 bottles',
    rate: '₱2.20',
    idealFor: 'Medium offices / branches',
    inclusions: '+ 2 Free Dispensers; priority delivery',
    employees: '50 – 75',
    stations: '2 Stations',
  },
  {
    name: 'Growth',
    monthlyFee: '₱10,000',
    liters: '4,255 L',
    bottles: '≈ 224 bottles',
    rate: '₱2.35',
    idealFor: 'Growing offices / small warehouses',
    inclusions: '+ 2 Free Dispensers; analytics dashboard; scheduled delivery',
    employees: '150 – 250',
    stations: '2 – 3 Stations',
  },
  {
    name: 'Business',
    monthlyFee: '₱15,000',
    liters: '6,383 L',
    bottles: '≈ 336 bottles',
    rate: '₱2.35',
    idealFor: 'Expanding companies / multi-branch offices',
    inclusions: '+ 3 Free Dispensers; compliance tools; analytics access',
    employees: '300 – 450',
    stations: '3 – 4 Stations',
  },
  {
    name: 'Enterprise+',
    monthlyFee: '₱35,000',
    liters: '30,000 L',
    bottles: '≈ 1,579 bottles',
    rate: '₱1.90',
    idealFor: 'Multi-site companies',
    inclusions: '+ 6 Free Dispensers; centralized reporting',
    employees: '500+',
    stations: '5+ Stations',
  },
  {
    name: 'Unlimited+',
    monthlyFee: '₱50,000',
    liters: 'Unlimited *',
    bottles: '—',
    rate: '—',
    idealFor: '24 / 7 operations / food industries',
    inclusions: 'Unlimited dispenser support; dedicated account manager',
    employees: 'Flexible',
    stations: 'Dynamic Allocation (Multiple Stations)',
  },
  {
    name: 'Customized',
    monthlyFee: 'Flexible',
    liters: 'Flexible',
    bottles: 'Flexible',
    rate: 'Based on volume',
    idealFor: 'Corporations, government, or industrial users',
    inclusions: 'Custom liters, billing cycles, and multi-location integration',
    employees: '—',
    stations: 'Assigned Based on Coverage Area',
  },
];

export default function PlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Refill - Subscription Model</h1>
          <p className="text-muted-foreground">
            Step 2: Select a Subscription Plan
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new">Previous</Link>
            </Button>
            <Button>Next Step</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Overview</CardTitle>
          <CardDescription>
          Unlimited and Automated Reliable Drinking Water Supply for Every Business Size. Smart Refill combines liter-based allocation with monthly subscription flexibility, providing predictable billing, automated refills, and no wasted water through roll-over credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup defaultValue="pro">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Included Liters</TableHead>
                  <TableHead>Est. Bottles</TableHead>
                  <TableHead>Ideal For</TableHead>
                  <TableHead>Inclusions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.name}>
                    <TableCell>
                      <RadioGroupItem value={plan.name.toLowerCase()} id={plan.name.toLowerCase()} />
                    </TableCell>
                    <TableCell>
                      <Label htmlFor={plan.name.toLowerCase()} className="font-semibold">{plan.name}</Label>
                    </TableCell>
                    <TableCell>{plan.monthlyFee}</TableCell>
                    <TableCell>{plan.liters}</TableCell>
                    <TableCell>{plan.bottles}</TableCell>
                    <TableCell>{plan.idealFor}</TableCell>
                    <TableCell>{plan.inclusions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
