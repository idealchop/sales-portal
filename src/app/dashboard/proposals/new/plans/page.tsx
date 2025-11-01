
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
import { Building, Building2, Store, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Rocket, Phone, Bot, HeartPulse, Coffee, Car, Users, GlassWater, Package, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type Plan = {
  name: string;
  monthlyFee: string;
  liters: string;
  bottles: string;
  rate: string;
  inclusions: string[];
  employees: string;
  stations: string;
  isRecommended?: boolean;
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
    bottles: '26',
    rate: '₱2.50',
    inclusions: ['Free delivery', 'Refill tracking via app'],
    employees: '5 – 10',
    stations: '1 Station',
  },
  {
    name: 'Starter',
    monthlyFee: '₱2,000',
    liters: '1,000 L',
    bottles: '53',
    rate: '₱2.40',
    inclusions: ['+ 1 Free Dispenser', 'Compliance monitoring'],
    employees: '10 – 20',
    stations: '1 Station',
  },
  {
    name: 'Pro',
    monthlyFee: '₱7,500',
    liters: '5,000 L',
    bottles: '263',
    rate: '₱2.20',
    inclusions: ['+ 2 Free Dispensers', 'Priority delivery'],
    employees: '50 – 75',
    stations: '2 Stations',
    isRecommended: true,
  },
];

const mediumPlans: Plan[] = [
  {
    name: 'Growth',
    monthlyFee: '₱10,000',
    liters: '4,255 L',
    bottles: '224',
    rate: '₱2.35',
    inclusions: ['+ 2 Free Dispensers', 'Analytics dashboard', 'Scheduled delivery'],
    employees: '150 – 250',
    stations: '2 – 3 Stations',
  },
  {
    name: 'Business',
    monthlyFee: '₱15,000',
    liters: '6,383 L',
    bottles: '336',
    rate: '₱2.35',
    inclusions: ['+ 3 Free Dispensers', 'Compliance tools', 'Analytics access'],
    employees: '300 – 450',
    stations: '3 – 4 Stations',
    isRecommended: true,
  },
  {
    name: 'Enterprise+',
    monthlyFee: '₱35,000',
    liters: '30,000 L',
    bottles: '1,579',
    rate: '₱1.90',
    inclusions: ['+ 6 Free Dispensers', 'Centralized reporting'],
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
        inclusions: ['Unlimited dispenser support', 'Dedicated account manager'],
        employees: 'Flexible',
        stations: 'Dynamic Allocation (Multiple Stations)',
    },
    {
        name: 'Enterprise 75',
        monthlyFee: '₱75,000',
        liters: '40,000 L',
        bottles: '2,105',
        rate: '₱1.88',
        inclusions: ['Dedicated support', 'Advanced analytics'],
        employees: '750+',
        stations: '8+ Stations',
        isRecommended: true,
    },
    {
        name: 'Enterprise 100',
        monthlyFee: '₱100,000',
        liters: '60,000 L',
        bottles: '3,158',
        rate: '₱1.67',
        inclusions: ['Full-time account manager', 'Custom API integration'],
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
        inclusions: ['Billed only based on consumption', 'Real-time tracking.'],
        employees: 'Flexible',
        stations: 'Dynamic Allocation',
        isRecommended: true,
    },
    {
        name: 'Customized',
        monthlyFee: 'Flexible',
        liters: 'Flexible',
        bottles: 'Flexible',
        rate: 'Based on volume',
        inclusions: ['Custom liters', 'Billing cycles', 'Multi-location integration'],
        employees: '—',
        stations: 'Assigned Based on Coverage Area',
    },
]

type BusinessSize = 'small' | 'medium' | 'large' | 'flow';


function PlansGrid({ plans, defaultPlan }: { plans: Plan[], defaultPlan: string }) {
  return (
    <RadioGroup defaultValue={defaultPlan} className="grid grid-cols-1 gap-6 items-start">
      {plans.map((plan) => (
        <Label htmlFor={plan.name.toLowerCase()} key={plan.name} className="cursor-pointer h-full">
          <Card className={cn(
            "relative flex flex-col h-full",
            "border-2",
            plan.isRecommended ? "border-primary" : ""
          )}>
            {plan.isRecommended && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-md">
                Recommended
              </div>
            )}
            <CardHeader className="flex-1">
              <CardTitle>{plan.name}</CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{plan.monthlyFee}</span>
                {plan.name !== 'Flow Plan' && plan.name !== 'Customized' && plan.name !== 'Unlimited+' && <span className="text-muted-foreground">/ month</span>}
              </div>
              <div className="flex justify-around text-center text-sm pt-4">
                  <div>
                      <p className="font-bold text-lg">{plan.liters}</p>
                      <p className="text-muted-foreground">Liters</p>
                  </div>
                   <div>
                      <p className="font-bold text-lg">≈ {plan.bottles}</p>
                      <p className="text-muted-foreground">Bottles</p>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <Separator />
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.inclusions.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 justify-between items-center rounded-b-lg">
                <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{plan.employees} Employees</span>
                </div>
                <RadioGroupItem value={plan.name.toLowerCase()} id={plan.name.toLowerCase()} />
            </CardFooter>
          </Card>
        </Label>
      ))}
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
    const smallBusinessImage = {
        imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FSmartrefill_SME.png?alt=media&token=eda50afe-7dd2-494c-ab48-0508dd3be81a",
        description: "An office with a few people",
        imageHint: "small office"
    };
    const mediumBusinessImage = PlaceHolderImages.find(p => p.title === 'medium-business');
    const largeBusinessImage = PlaceHolderImages.find(p => p.title === 'large-business');
    const flowPlanImage = PlaceHolderImages.find(p => p.title === 'flow-plan');

    const sizes: { id: BusinessSize, title: string, description: string, image: any }[] = [
        { id: 'small', title: 'SME', description: 'For small teams, kiosks, and home offices.', image: smallBusinessImage },
        { id: 'medium', title: 'Medium Business', description: 'For growing offices and warehouses.', image: mediumBusinessImage },
        { id: 'large', title: 'Large Enterprise', description: 'For multi-site companies and BPOs.', image: largeBusinessImage },
        { id: 'flow', title: 'Smart Flow Plan', description: 'Pay based on your actual water consumption.', image: flowPlanImage },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sizes.map((size) => (
                <Card
                    key={size.id}
                    onClick={() => onSelectSize(size.id)}
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden flex flex-col',
                        selectedSize === size.id ? 'border-primary shadow-lg border-2' : ''
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
                    <CardHeader className="flex-1">
                        <div>
                            <CardTitle>{size.title}</CardTitle>
                            <CardDescription>{size.description}</CardDescription>
                        </div>
                    </CardHeader>
                     <CardFooter className="bg-muted/50 p-4">
                        <div className="text-sm space-y-2">
                           <p className="font-semibold">Ideal for:</p>
                            <ul className="list-disc list-inside text-muted-foreground text-xs">
                                {size.id === 'small' && <><li>Small offices & clinics</li><li>Retail stores & cafes</li><li>Home-based businesses</li></>}
                                {size.id === 'medium' && <><li>Growing companies</li><li>Mid-sized offices</li><li>Warehouse facilities</li></>}
                                {size.id === 'large' && <><li>BPOs & call centers</li><li>Multi-site corporations</li><li>Hotel & restaurant chains</li></>}
                                {size.id === 'flow' && <><li>Businesses with fluctuating demand</li><li>Event-based water needs</li><li>Seasonal operations</li></>}
                            </ul>
                        </div>
                    </CardFooter>
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
                return <PlansGrid plans={smallPlans} defaultPlan="pro" />;
            case 'medium':
                return <PlansGrid plans={mediumPlans} defaultPlan="business" />;
            case 'large':
                return <PlansGrid plans={largePlans} defaultPlan="enterprise 75" />;
            case 'flow':
                return <PlansGrid plans={flowPlans} defaultPlan="flow plan" />;
            default:
                return <p className="text-muted-foreground text-center">Select a business size to see plan details.</p>;
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
          <CardTitle>Plan Selection</CardTitle>
          <CardDescription>
            Select the client's business size to see the recommended plans, then choose the best plan for your client.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">1. Select Business Size</h3>
            <BusinessSizeSelector selectedSize={selectedSize} onSelectSize={handleSizeSelect} />
          </div>
          <div className="lg:col-span-1">
             <h3 className="text-lg font-semibold mb-4">2. Choose a Plan</h3>
              {renderPlans()}
          </div>
        </CardContent>
      </Card>

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


