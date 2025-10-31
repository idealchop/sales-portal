
'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { Building, Building2, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

type Plan = {
  name: string;
  monthlyFee: string;
  liters: string;
  bottles: string;
  rate: string;
  inclusions: string;
  employees: string;
  stations: string;
};


const smallPlans: Plan[] = [
  {
    name: 'Micro',
    monthlyFee: '₱1,000',
    liters: '500 L',
    bottles: '≈ 26 bottles',
    rate: '₱2.50',
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
    inclusions: '+ 2 Free Dispensers; priority delivery',
    employees: '50 – 75',
    stations: '2 Stations',
  },
];

const mediumPlans: Plan[] = [
  {
    name: 'Growth',
    monthlyFee: '₱10,000',
    liters: '4,255 L',
    bottles: '≈ 224 bottles',
    rate: '₱2.35',
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
    inclusions: '+ 6 Free Dispensers; centralized reporting',
    employees: '500+',
    stations: '5+ Stations',
  },
];

const largePlans: Plan[] = [
    {
        name: 'Unlimited+',
        monthlyFee: '₱50,000',
        liters: 'Unlimited *',
        bottles: '—',
        rate: '—',
        inclusions: 'Unlimited dispenser support; dedicated account manager',
        employees: 'Flexible',
        stations: 'Dynamic Allocation (Multiple Stations)',
    },
    {
        name: 'Enterprise 75',
        monthlyFee: '₱75,000',
        liters: '40,000 L',
        bottles: '≈ 2,105 bottles',
        rate: '₱1.88',
        inclusions: 'Dedicated support; advanced analytics',
        employees: '750+',
        stations: '8+ Stations',
    },
    {
        name: 'Enterprise 100',
        monthlyFee: '₱100,000',
        liters: '60,000 L',
        bottles: '≈ 3,158 bottles',
        rate: '₱1.67',
        inclusions: 'Full-time account manager; custom API integration',
        employees: '1000+',
        stations: '12+ Stations',
    },
    {
        name: 'Flow Plan',
        monthlyFee: 'Consumption-based',
        liters: 'Unlimited',
        bottles: '—',
        rate: '₱3.00',
        inclusions: 'Billed only based on consumption, real-time tracking.',
        employees: 'Flexible',
        stations: 'Dynamic Allocation',
    },
    {
        name: 'Customized',
        monthlyFee: 'Flexible',
        liters: 'Flexible',
        bottles: 'Flexible',
        rate: 'Based on volume',
        inclusions: 'Custom liters, billing cycles, and multi-location integration',
        employees: '—',
        stations: 'Assigned Based on Coverage Area',
    },
];

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


type BusinessSize = 'small' | 'medium' | 'large';


function PlansTable({ plans, defaultPlan }: { plans: Plan[], defaultPlan: string }) {
    return (
        <RadioGroup defaultValue={defaultPlan}>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Included Liters</TableHead>
                    <TableHead>Est. Bottles</TableHead>
                    <TableHead>Inclusions</TableHead>
                    <TableHead>Water Stations Provider</TableHead>
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
                    <TableCell>{plan.inclusions}</TableCell>
                    <TableCell>{plan.stations}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </RadioGroup>
    );
}

function BusinessSizeSelector({
    selectedSize,
    onSelectSize,
}: {
    selectedSize: BusinessSize | null;
    onSelectSize: (size: BusinessSize) => void;
}) {
    const sizes: { id: BusinessSize, icon: React.ReactNode, title: string, description: string }[] = [
        { id: 'small', icon: <Store className="h-8 w-8 text-primary" />, title: 'Small Business', description: 'For small teams, kiosks, and home offices.' },
        { id: 'medium', icon: <Building className="h-8 w-8 text-primary" />, title: 'Medium Business', description: 'For growing offices and warehouses.' },
        { id: 'large', icon: <Building2 className="h-8 w-8 text-primary" />, title: 'Large Enterprise', description: 'For multi-site companies and BPOs.' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sizes.map((size) => (
                <Card
                    key={size.id}
                    onClick={() => onSelectSize(size.id)}
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50',
                        selectedSize === size.id ? 'border-primary shadow-lg' : ''
                    )}
                >
                    <CardHeader className="flex flex-row items-center gap-4">
                        {size.icon}
                        <div>
                            <CardTitle>{size.title}</CardTitle>
                            <CardDescription>{size.description}</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}


export default function PlansPage() {
    const [selectedSize, setSelectedSize] = useState<BusinessSize | null>('small');

    const handleSizeSelect = (size: BusinessSize) => {
        setSelectedSize(size);
    };
    
    const renderPlans = () => {
        switch (selectedSize) {
            case 'small':
                return <PlansTable plans={smallPlans} defaultPlan="pro" />;
            case 'medium':
                return <PlansTable plans={mediumPlans} defaultPlan="business" />;
            case 'large':
                return <PlansTable plans={largePlans} defaultPlan="flow plan" />;
            default:
                return null;
        }
    };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Refill - Subscription Model</h1>
          <p className="text-muted-foreground">
            Step 4: Select a Subscription Plan & Payment Options
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new/comparison">Previous</Link>
            </Button>
            <Button asChild>
                <Link href="/dashboard/proposals/new/inclusions">Next Step</Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Overview</CardTitle>
          <CardDescription>
          Select the client's business size to see the recommended plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessSizeSelector selectedSize={selectedSize} onSelectSize={handleSizeSelect} />
        </CardContent>
      </Card>
      
      {selectedSize && (
        <Card>
            <CardContent className="pt-6">
                 {renderPlans()}
            </CardContent>
        </Card>
      )}

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
