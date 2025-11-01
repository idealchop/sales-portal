
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useState, useMemo } from 'react';
import { Building, Building2, Store, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Rocket, Phone, Bot, HeartPulse, Coffee, Car, Users, GlassWater, Package, Check, RefreshCcw, Waves, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';

type Plan = {
  id: string;
  name: string;
  monthlyFee: string;
  liters: string;
  refillFrequency: string;
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
    id: 'micro',
    name: 'Micro',
    monthlyFee: '₱1,500',
    liters: '500 L',
    refillFrequency: '1–2/week',
    inclusions: ['Free delivery', 'Refill tracking app'],
    employees: '5 – 10',
    stations: '1 Station',
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyFee: '₱3,000',
    liters: '1,000 L',
    refillFrequency: '2–3/week',
    inclusions: ['+1 Free Dispenser', 'Compliance monitoring'],
    employees: '10 – 20',
    stations: '1 Station',
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyFee: '₱6,000',
    liters: '2,000 L',
    refillFrequency: '3–4/week',
    inclusions: ['+1 Free Dispenser', 'Scheduled delivery', 'Priority service'],
    employees: '20 – 40',
    stations: '1 Station',
    isRecommended: true,
  },
];

const commercialPlans: Plan[] = [
  {
    id: 'growth',
    name: 'Growth',
    monthlyFee: '₱9,000',
    liters: '3,000 L',
    refillFrequency: '4–5/week',
    inclusions: ['+2 Free Dispensers', 'Analytics dashboard'],
    employees: '40 – 70',
    stations: '2 Stations',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyFee: '₱12,000',
    liters: '4,000 L',
    refillFrequency: '5–6/week',
    inclusions: ['+2 Free Dispensers', 'Priority delivery'],
    employees: '70 – 100',
    stations: '2 – 3 Stations',
    isRecommended: true,
  },
  {
    id: 'business',
    name: 'Business',
    monthlyFee: '₱18,000',
    liters: '6,000 L',
    refillFrequency: 'Daily',
    inclusions: ['+3 Free Dispensers', 'Compliance tools', 'Dashboard access'],
    employees: '100 – 150',
    stations: '2 – 3 Stations',
  },
];

const corporatePlans: Plan[] = [
    {
        id: 'enterprise-basic',
        name: 'Enterprise Basic',
        monthlyFee: '₱30,000',
        liters: '10,000 L',
        refillFrequency: '1–2/day',
        inclusions: ['+3 Free Dispensers', 'Scheduled delivery', 'Basic analytics'],
        employees: '150 – 250',
        stations: '2 – 3 Stations',
    },
    {
        id: 'enterprise-plus',
        name: 'Enterprise Plus',
        monthlyFee: '₱50,000',
        liters: '16,600 L',
        refillFrequency: '2–3/day',
        inclusions: ['+5 Free Dispensers', 'Advanced compliance & water tracking'],
        employees: '250 – 350',
        stations: '2 – 3 Stations',
        isRecommended: true,
    },
    {
        id: 'enterprise-elite',
        name: 'Enterprise Elite',
        monthlyFee: '₱75,000',
        liters: '25,000 L',
        refillFrequency: '3+/day',
        inclusions: ['+6 Free Dispensers', 'Dedicated account manager', 'Centralized reporting'],
        employees: '350 – 500',
        stations: '3 – 4 Stations',
    },
    {
        id: 'enterprise-pro',
        name: 'Enterprise Pro',
        monthlyFee: '₱100,000+',
        liters: '33,000+ L',
        refillFrequency: 'Continuous',
        inclusions: ['Tailored solution', 'Custom liters, billing, reporting & support'],
        employees: '500+',
        stations: '5+ Stations',
    },
];

const flowPlans: Plan[] = [
    {
        id: 'enterprise-customized',
        name: 'Enterprise Customized',
        monthlyFee: 'Custom',
        liters: 'Custom',
        refillFrequency: 'Scheduled',
        inclusions: ['Starts at ₱100,000 / month', 'Tailored setup, custom liters, flexible billing', 'Dedicated account manager'],
        employees: '—',
        stations: '5+ Verified Stations',
        isRecommended: true,
    },
    {
        id: 'enterprise-overflow',
        name: 'Enterprise Overflow',
        monthlyFee: 'Usage-Based',
        liters: 'No cap',
        refillFrequency: 'On-demand',
        inclusions: ['₱0 Base Fee + ₱3.00–₱3.50 / liter', 'Pay per actual consumption', 'Smart consumption tracking'],
        employees: '—',
        stations: 'Multiple partner stations',
    },
]

export const allPlans = [...smePlans, ...commercialPlans, ...corporatePlans, ...flowPlans];

type BusinessSize = 'sme' | 'commercial' | 'corporate' | 'flow';


const deliveryFrequencies = [
    { value: 1, label: '1 time a week' },
    { value: 2, label: '2 times a week' },
    { value: 3, label: '3 times a week' },
    { value: 4, label: '4 times a week' },
    { value: 5, label: '5 times a week' },
    { value: 6, label: '6 times a week' },
    { value: 7, label: 'Daily' },
];

function CustomPlanCalculator({pricePerLiter = 3}: {pricePerLiter?: number}) {
    const [bottles, setBottles] = useState(10);
    const [deliveries, setDeliveries] = useState(1);
    const litersPerBottle = 19;

    const totalLiters = bottles * deliveries * 4 * litersPerBottle;
    const totalCost = totalLiters * pricePerLiter;
    
    const getStations = (liters: number) => {
        if (liters <= 2000) return '1 Station';
        if (liters <= 6000) return '2-3 Stations';
        if (liters <= 25000) return '3-4 Stations';
        return '5+ Stations';
    }

    const getFrequency = (deliveries: number) => {
        const freq = deliveryFrequencies.find(f => f.value === deliveries);
        return freq ? freq.label.replace(' times a week', '/week').replace(' 1 time a week', '1/week') : `${deliveries}/week`;
    }

    const currencyFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });


    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="bottles" className="text-sm font-medium text-primary-foreground/80">5-Gallon Bottles per Delivery</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground" onClick={() => setBottles(Math.max(1, bottles - 1))}><Minus className="h-4 w-4" /></Button>
                        <Input id="bottles" type="number" value={bottles} onChange={(e) => setBottles(parseInt(e.target.value) || 0)} className="text-center bg-transparent border-primary-foreground/50 text-primary-foreground placeholder:text-primary-foreground/60" />
                        <Button variant="outline" size="icon" className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground" onClick={() => setBottles(bottles + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="deliveries" className="text-sm font-medium text-primary-foreground/80">Deliveries per Week</Label>
                    <Select value={String(deliveries)} onValueChange={(value) => setDeliveries(Number(value))}>
                        <SelectTrigger id="deliveries" className="bg-transparent border-primary-foreground/50 text-primary-foreground">
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            {deliveryFrequencies.map((freq) => (
                                <SelectItem key={freq.value} value={String(freq.value)}>{freq.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                <CardHeader>
                    <CardTitle className="text-base text-primary-foreground">Custom Plan Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                     <div className="flex justify-between items-center">
                        <span className="text-primary-foreground/80">Total Liters per Month</span>
                        <span className="font-bold">{totalLiters.toLocaleString()} L</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-primary-foreground/80">Recommended Stations</span>
                        <span className="font-semibold">{getStations(totalLiters)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-primary-foreground/80">Avg. Refill Frequency</span>
                        <span className="font-semibold">{getFrequency(deliveries)}</span>
                    </div>
                    <Separator className="bg-primary-foreground/20" />
                    <div className="flex justify-between items-center">
                        <span className="text-primary-foreground/80">Price per Liter</span>
                        <span className="font-semibold">{currencyFormatter.format(pricePerLiter)}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="font-bold">Estimated Monthly Cost</span>
                        <span className="font-bold text-lg">{currencyFormatter.format(totalCost)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}


function PlansGrid({ plans, defaultPlan, selectedPlan, onSelectPlan, businessSize }: { plans: Plan[], defaultPlan: string, selectedPlan: string | null, onSelectPlan: (planId: string) => void, businessSize: BusinessSize | null }) {

  return (
    <RadioGroup
        value={selectedPlan ?? defaultPlan} 
        onValueChange={onSelectPlan}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
    >
      {plans.map((plan) => {
        const isSelected = selectedPlan === plan.id;
        const isCustom = businessSize === 'flow' && plan.id === 'enterprise-customized';
        const isOverflow = businessSize === 'flow' && plan.id === 'enterprise-overflow';
        const isDisabled = isOverflow;

        return (
            <Label 
                htmlFor={plan.id} 
                key={plan.name} 
                className={cn(
                    "cursor-pointer h-full", 
                    (isCustom || isOverflow) && "md:col-span-2 lg:col-span-3",
                    isDisabled && "cursor-not-allowed opacity-70"
                )}
            >
            <Card className={cn(
                "relative flex flex-col h-full border-2 transition-all duration-300",
                isSelected 
                ? "border-primary shadow-lg bg-primary text-primary-foreground" 
                : "bg-card text-card-foreground border shadow-md hover:border-primary/50"
            )}>
                {plan.isRecommended && !isSelected && (
                <div className="absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-md bg-primary text-primary-foreground">
                    Recommended
                </div>
                )}
                 {isSelected && !isDisabled && (
                <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground">
                    <Check className="h-4 w-4 text-primary" />
                </div>
                )}
                <CardHeader className="flex-1">
                <CardTitle className={cn("text-2xl", isSelected && "text-primary-foreground")}>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-2">
                    {plan.monthlyFee !== 'Custom' && plan.monthlyFee !== 'Usage-Based' && <span className={cn("text-3xl font-bold", isSelected && "text-primary-foreground")}>{plan.monthlyFee}</span>}
                    {plan.monthlyFee === 'Usage-Based' && <span className={cn("text-3xl font-bold", isSelected && "text-primary-foreground")}>{plan.monthlyFee}</span>}
                    {plan.name !== 'Enterprise Customized' && plan.name !== 'Enterprise Overflow' && <span className={cn("font-semibold", isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>/ month</span>}
                </div>
                </CardHeader>
                <CardContent className="flex-1 text-left space-y-4">
                    <div className="space-y-2">
                        <p className={cn("text-sm font-semibold", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>Liters Included</p>
                        <div className={cn("flex items-center gap-2 text-lg font-bold", isSelected && "text-primary-foreground")}>
                            <span>{plan.liters}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className={cn("text-sm font-semibold", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>Avg. Refill Frequency</p>
                        <div className={cn("flex items-center gap-2 text-lg font-bold", isSelected && "text-primary-foreground")}>
                             <RefreshCcw className="h-5 w-5" />
                            <span>{plan.refillFrequency}</span>
                        </div>
                    </div>
                </CardContent>
                
                {isCustom && isSelected && <CustomPlanCalculator />}
                {isOverflow && isSelected && <CustomPlanCalculator pricePerLiter={3.00} />}

                <CardFooter className={cn("p-4 rounded-b-lg", isSelected ? "bg-black/20" : "bg-muted")}>
                    <div className="flex justify-between items-center w-full text-sm">
                        <div className={cn("flex items-center gap-2", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            <Users className="h-5 w-5" />
                            <span className="font-semibold">{plan.employees}</span>
                        </div>
                        <div className={cn("flex items-center gap-2", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                            <Building2 className="h-5 w-5" />
                            <span className="font-semibold">{plan.stations}</span>
                        </div>
                        <RadioGroupItem 
                            value={plan.id} 
                            id={plan.id}
                            className="sr-only"
                            disabled={isDisabled}
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
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    const handleSizeSelect = (size: BusinessSize) => {
        setSelectedSize(size);
        if (size === 'flow') {
            setSelectedPlan('enterprise-customized');
        } else {
            setSelectedPlan(null); // Reset plan selection when size changes
        }
    };

    const handlePlanSelect = (planId: string) => {
        const plan = allPlans.find(p => p.id === planId);
        if(plan?.id === 'enterprise-overflow') {
            return;
        }
        setSelectedPlan(planId);
    }
    
    const renderPlans = () => {
        switch (selectedSize) {
            case 'sme':
                return <PlansGrid plans={smePlans} defaultPlan="professional" selectedPlan={selectedPlan} onSelectPlan={handlePlanSelect} businessSize={selectedSize} />;
            case 'commercial':
                return <PlansGrid plans={commercialPlans} defaultPlan="pro" selectedPlan={selectedPlan} onSelectPlan={handlePlanSelect} businessSize={selectedSize} />;
            case 'corporate':
                return <PlansGrid plans={corporatePlans} defaultPlan="enterprise-plus" selectedPlan={selectedPlan} onSelectPlan={handlePlanSelect} businessSize={selectedSize} />;
            case 'flow':
                return <PlansGrid plans={flowPlans} defaultPlan="enterprise-customized" selectedPlan={selectedPlan} onSelectPlan={handlePlanSelect} businessSize={selectedSize} />;
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
                <Button asChild={!!selectedPlan} disabled={!selectedPlan}>
                    <Link href={selectedPlan ? `/dashboard/proposals/new/contract?plan=${selectedPlan}` : '#'}>Next Step</Link>
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
                        <Button variant="outline" onClick={() => { setSelectedSize(null); setSelectedPlan(null); }}>
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
