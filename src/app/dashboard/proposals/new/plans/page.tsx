
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
  CardFooter,
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
import { Building, Building2, Store, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Rocket, Phone, Bot, HeartPulse, Coffee, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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

const inclusions = [
    {
        icon: <Computer className="h-5 w-5 text-primary" />,
        title: 'Smart Client Portal',
        description: 'Monitor consumption, compliance, water providers, and payments in real time.',
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

const perks = [
    {
        icon: <HeartPulse className="h-8 w-8 text-muted-foreground" />,
        partner: 'HealthFirst Clinic',
        description: 'Multi-specialty medical clinics.',
        benefit: '15% discount on annual physical exams for all employees.',
    },
    {
        icon: <Coffee className="h-8 w-8 text-muted-foreground" />,
        partner: 'The Daily Grind Cafe',
        description: 'Specialty coffee and pastries.',
        benefit: '10% off on all bulk coffee bean orders for the office pantry.',
    },
    {
        icon: <Building className="h-8 w-8 text-muted-foreground" />,
        partner: 'FlexiSpace Co-Working',
        description: 'Modern and flexible office solutions.',
        benefit: 'One free day pass per month at any FlexiSpace location nationwide.',
    },
    {
        icon: <Car className="h-8 w-8 text-muted-foreground" />,
        partner: 'EcoDrive Car Service',
        description: 'Eco-friendly car wash and detailing.',
        benefit: '20% discount on all corporate car wash and detailing services.',
    }
];


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
];

const flowPlans: Plan[] = [
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
]

type BusinessSize = 'small' | 'medium' | 'large' | 'flow';


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
                    <TableHead>Employees Covered</TableHead>
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
                    <TableCell>{plan.employees}</TableCell>
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
    const smallBusinessImage = PlaceHolderImages.find(p => p.title === 'small-business');
    const mediumBusinessImage = PlaceHolderImages.find(p => p.title === 'medium-business');
    const largeBusinessImage = PlaceHolderImages.find(p => p.title === 'large-business');
    const flowPlanImage = PlaceHolderImages.find(p => p.title === 'flow-plan');

    const sizes: { id: BusinessSize, icon: React.ReactNode, title: string, description: string, image: any }[] = [
        { id: 'small', icon: <Store className="h-8 w-8 text-primary" />, title: 'Small Business', description: 'For small teams, kiosks, and home offices.', image: smallBusinessImage },
        { id: 'medium', icon: <Building className="h-8 w-8 text-primary" />, title: 'Medium Business', description: 'For growing offices and warehouses.', image: mediumBusinessImage },
        { id: 'large', icon: <Building2 className="h-8 w-8 text-primary" />, title: 'Large Enterprise', description: 'For multi-site companies and BPOs.', image: largeBusinessImage },
        { id: 'flow', icon: <Bot className="h-8 w-8 text-primary" />, title: 'Smart Flow Plan', description: 'Pay based on your actual water consumption.', image: flowPlanImage },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sizes.map((size) => (
                <Card
                    key={size.id}
                    onClick={() => onSelectSize(size.id)}
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden',
                        selectedSize === size.id ? 'border-primary shadow-lg' : ''
                    )}
                >
                    {size.image && (
                         <div className="aspect-video relative">
                            <Image
                                src={size.image.imageUrl}
                                alt={size.image.description}
                                fill
                                className="object-cover"
                                data-ai-hint={size.image.imageHint}
                            />
                        </div>
                    )}
                    <CardHeader>
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
                return <PlansTable plans={largePlans} defaultPlan="enterprise+" />;
            case 'flow':
                return <PlansTable plans={flowPlans} defaultPlan="flow plan" />;
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
            Step 4: Select a Subscription Plan & Review Inclusions
          </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard/proposals/new/comparison">Previous</Link>
            </Button>
            <Button asChild>
                <Link href="/dashboard/proposals/new/contract">Next Step</Link>
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Included in Every Plan</CardTitle>
             <CardDescription>
                Every subscription plan includes full access to our growing network of partner perks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {inclusions.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div>{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partner Perks</CardTitle>
            <CardDescription>
                Enhance your subscription with exclusive benefits from our partners, included with every plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 sm:grid-cols-2">
            {perks.map((perk) => (
                <div key={perk.partner} className="flex items-start gap-4">
                    {perk.icon}
                    <div className="space-y-1">
                        <h3 className="font-semibold">{perk.partner}</h3>
                        <p className="text-sm text-muted-foreground">{perk.description}</p>
                        <p className="text-sm font-medium text-primary">{perk.benefit}</p>
                    </div>
                </div>
            ))}
          </CardContent>
           <CardFooter>
             <div className="text-sm text-muted-foreground space-y-2">
               <p className="font-semibold text-foreground">Terms:</p>
               <ul className="list-disc list-inside space-y-1">
                    <li>All employees of the subscribed company are eligible for these perks.</li>
                    <li>To redeem, employees must present their company ID at partner establishments.</li>
               </ul>
            </div>
          </CardFooter>
        </Card>
      </div>

    </div>
  );
}

    

    
