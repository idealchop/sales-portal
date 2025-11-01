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
import { Building, Building2, Store, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Rocket, Phone, Bot, HeartPulse, Coffee, Car, Users, GlassWater, Package, Check, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type Plan = {
  name: string;
  monthlyFee: string;
  liters: string;
  bottles: string;
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


const smePlans: Plan[] = [
  {
    name: 'Micro',
    monthlyFee: '₱1,500',
    liters: '500 L',
    bottles: '26',
    inclusions: ['Free delivery', 'Refill tracking app'],
    employees: '5 – 10',
    stations: '1 Station',
  },
  {
    name: 'Starter',
    monthlyFee: '₱3,000',
    liters: '1,000 L',
    bottles: '53',
    inclusions: ['+1 Free Dispenser', 'Compliance monitoring'],
    employees: '10 – 20',
    stations: '1 Station',
  },
  {
    name: 'Professional',
    monthlyFee: '₱6,000',
    liters: '2,000 L',
    bottles: '105',
    inclusions: ['+1 Free Dispenser', 'Scheduled delivery', 'Priority service'],
    employees: '20 – 40',
    stations: '1 Station',
    isRecommended: true,
  },
];

const commercialPlans: Plan[] = [
  {
    name: 'Growth',
    monthlyFee: '₱9,000',
    liters: '3,000 L',
    bottles: '158',
    inclusions: ['+2 Free Dispensers', 'Analytics dashboard'],
    employees: '40 – 70',
    stations: '2 Stations',
  },
  {
    name: 'Pro',
    monthlyFee: '₱12,000',
    liters: '4,000 L',
    bottles: '211',
    inclusions: ['+2 Free Dispensers', 'Priority delivery'],
    employees: '70 – 100',
    stations: '2 – 3 Stations',
    isRecommended: true,
  },
  {
    name: 'Business',
    monthlyFee: '₱18,000',
    liters: '6,000 L',
    bottles: '316',
    inclusions: ['+3 Free Dispensers', 'Compliance tools', 'Dashboard access'],
    employees: '100 – 150',
    stations: '2 – 3 Stations',
  },
];

const corporatePlans: Plan[] = [
    {
        name: 'Enterprise Basic',
        monthlyFee: '₱30,000',
        liters: '10,000 L',
        bottles: '526',
        inclusions: ['+3 Free Dispensers', 'Scheduled delivery', 'Basic analytics'],
        employees: '150 – 250',
        stations: '2 – 3 Stations',
    },
    {
        name: 'Enterprise Plus',
        monthlyFee: '₱50,000',
        liters: '16,600 L',
        bottles: '874',
        inclusions: ['+5 Free Dispensers', 'Advanced compliance & water tracking'],
        employees: '250 – 350',
        stations: '2 – 3 Stations',
        isRecommended: true,
    },
    {
        name: 'Enterprise Elite',
        monthlyFee: '₱75,000',
        liters: '25,000 L',
        bottles: '1,316',
        inclusions: ['+6 Free Dispensers', 'Dedicated account manager', 'Centralized reporting'],
        employees: '350 – 500',
        stations: '3 – 4 Stations',
    },
    {
        name: 'Enterprise Pro',
        monthlyFee: '₱100,000+',
        liters: '33,000+ L',
        bottles: '1,737+',
        inclusions: ['Tailored solution', 'Custom liters, billing, reporting & support'],
        employees: '500+',
        stations: '5+ Stations',
    },
];

const flowPlans: Plan[] = [
    {
        name: 'Enterprise Customized',
        monthlyFee: 'Fixed (Prepaid)',
        liters: 'Custom',
        bottles: '—',
        inclusions: ['Starts at ₱100,000 / month', 'Tailored setup, custom liters, flexible billing', 'Dedicated account manager'],
        employees: '—',
        stations: '5+ Verified Stations',
        isRecommended: true,
    },
    {
        name: 'Enterprise Overflow',
        monthlyFee: 'Usage-Based',
        liters: 'No cap',
        bottles: '—',
        inclusions: ['₱0 Base Fee + ₱3.00–₱3.50 / liter', 'Pay per actual consumption', 'Smart consumption tracking'],
        employees: '—',
        stations: 'Multiple partner stations',
    },
]

type BusinessSize = 'sme' | 'commercial' | 'corporate' | 'flow';


function PlansGrid({ plans, defaultPlan }: { plans: Plan[], defaultPlan: string }) {
    const [selectedPlan, setSelectedPlan] = useState(defaultPlan);

  return (
    <RadioGroup 
        value={selectedPlan} 
        onValueChange={setSelectedPlan}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
    >
      {plans.map((plan) => {
        const isSelected = selectedPlan === plan.name.toLowerCase().replace(/ /g, '-');
        return (
            <Label htmlFor={plan.name.toLowerCase().replace(/ /g, '-')} key={plan.name} className="cursor-pointer h-full">
            <Card className={cn(
                "relative flex flex-col h-full border-2 transition-all duration-300",
                isSelected 
                ? "border-primary shadow-lg bg-primary/90 backdrop-blur-sm" 
                : "bg-card text-card-foreground border shadow-md hover:border-primary/50"
            )}>
                {plan.isRecommended && !isSelected && (
                <div className="absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-md bg-primary text-primary-foreground">
                    Recommended
                </div>
                )}
                 {isSelected && (
                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground">
                    <Check className="h-4 w-4 text-primary" />
                </div>
                )}
                <CardHeader className="flex-1">
                <CardTitle className={cn(isSelected ? "text-primary-foreground" : "")}>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-2">
                    <span className={cn("text-3xl font-bold", isSelected ? "text-primary-foreground" : "")}>{plan.monthlyFee}</span>
                    {plan.name !== 'Enterprise Customized' && plan.name !== 'Enterprise Overflow' && <span className={cn(isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>/ month</span>}
                </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <div className={cn("rounded-lg p-4", isSelected ? "bg-black/10" : "bg-muted")}>
                    <div className="flex justify-around text-center text-sm">
                        <div>
                            <p className={cn("font-bold text-lg", isSelected ? "text-primary-foreground" : "")}>{plan.liters}</p>
                            <p className={cn("text-sm", isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>Liters</p>
                        </div>
                        <div>
                            <p className={cn("font-bold text-lg", isSelected ? "text-primary-foreground" : "")}>≈ {plan.bottles}</p>
                            <p className={cn("text-sm", isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>Bottles</p>
                        </div>
                    </div>
                    </div>
                    <ul className={cn("space-y-2 text-sm", isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
                        {plan.inclusions.map((item, index) => (
                            <li key={index} className="flex items-center gap-2">
                                <Check className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-primary")} />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <CardFooter className={cn("p-4 rounded-b-lg", isSelected ? "bg-black/10" : "bg-muted")}>
                    <div className={cn("flex justify-between items-center w-full text-sm", isSelected ? "text-primary-foreground" : "")}>
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{plan.employees}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>{plan.stations}</span>
                        </div>
                        <RadioGroupItem 
                        value={plan.name.toLowerCase().replace(/ /g, '-')} 
                        id={plan.name.toLowerCase().replace(/ /g, '-')} 
                        className="sr-only"
                        />
                    </div>
                </CardFooter>
            </Card>
            </Label>
        )
      })}
    </RadioGroup>
  );
}

const businessSizes = [
    { 
        id: 'sme' as BusinessSize, 
        title: 'SME', 
        description: 'For small teams, kiosks, and home offices.', 
        image: {
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_SME.png?alt=media&token=e6beeb7b-3ed1-4e51-87cf-1b65b49041a1",
            description: "An office with a few people",
            imageHint: "small office"
        },
    },
    { 
        id: 'commercial' as BusinessSize, 
        title: 'Commercial', 
        description: 'For growing offices and warehouses.', 
        image: {
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Business.png?alt=media&token=b8536b3c-5199-460a-8612-003c99139d7c",
            description: "A medium-sized office building.",
            imageHint: "office building"
        },
    },
    { 
        id: 'corporate' as BusinessSize, 
        title: 'Corporate', 
        description: 'For multi-site companies and BPOs.', 
        image: {
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_Enterprise.png?alt=media&token=29e0d6a7-41f7-4511-a8b6-0369989421bd",
            description: "A large corporate building.",
            imageHint: "corporate building"
        },
    },
    { 
        id: 'flow' as BusinessSize, 
        title: 'Flowing Plans', 
        description: 'Pay based on your actual water consumption.', 
        image: {
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Flow.png?alt=media&token=6b11f719-39e9-4ea4-b4a6-1bbe587bfa63",
            description: "An abstract representation of a data flow.",
            imageHint: "data flow"
        },
    },
];

function BusinessSizeSelector({
    selectedSize,
    onSelectSize,
    hiddenSizes = [],
}: {
    selectedSize: BusinessSize | null;
    onSelectSize: (size: BusinessSize) => void;
    hiddenSizes?: BusinessSize[];
}) {
    const isItemSelected = selectedSize !== null;
    const gridCols = isItemSelected ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';

    return (
        <div className={cn("grid gap-4", gridCols)}>
            {businessSizes
              .filter(size => !hiddenSizes.includes(size.id))
              .map((size) => (
                <Card
                    key={size.id}
                    onClick={() => onSelectSize(size.id)}
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden flex flex-col',
                        selectedSize === size.id ? 'border-primary shadow-lg border-2' : ''
                    )}
                >
                    {size.image && (
                         <div className="relative aspect-video">
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
                </Card>
            ))}
        </div>
    );
}


export default function PlansPage() {
    const [selectedSize, setSelectedSize] = useState<BusinessSize | null>(null);

    const handleSizeSelect = (size: BusinessSize) => {
        setSelectedSize(size);
    };
    
    const renderPlans = () => {
        switch (selectedSize) {
            case 'sme':
                return <PlansGrid plans={smePlans} defaultPlan="professional" />;
            case 'commercial':
                return <PlansGrid plans={commercialPlans} defaultPlan="pro" />;
            case 'corporate':
                return <PlansGrid plans={corporatePlans} defaultPlan="enterprise-plus" />;
            case 'flow':
                return <PlansGrid plans={flowPlans} defaultPlan="enterprise-customized" />;
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
          <div className="flex items-center justify-between">
              <div>
                <CardTitle>1. Select Business Size</CardTitle>
                <CardDescription>
                  Choose the client's business size to see the recommended plans.
                </CardDescription>
              </div>
              {selectedSize && (
                <Button variant="outline" onClick={() => setSelectedSize(null)}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Change
                </Button>
              )}
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={cn(selectedSize ? "lg:col-span-1" : "lg:col-span-3")}>
                    <BusinessSizeSelector 
                        selectedSize={selectedSize} 
                        onSelectSize={handleSizeSelect}
                        hiddenSizes={selectedSize ? businessSizes.map(s => s.id).filter(id => id !== selectedSize) : []}
                    />
                </div>
                {selectedSize && (
                     <div className="lg:col-span-2">
                        <Card>
                             <CardHeader>
                                <CardTitle>2. Choose a Plan</CardTitle>
                                <CardDescription>Select the best plan for your client from the options below.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {renderPlans()}
                            </CardContent>
                        </Card>
                    </div>
                )}
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
              Every premium plan includes access to our growing network of partner benefits.
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
