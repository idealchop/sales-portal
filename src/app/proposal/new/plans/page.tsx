
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
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Building, Building2, Store, Computer, CalendarClock, RotateCw, AreaChart, Thermometer, Wrench, CircleHelp, Rocket, Phone, Bot, HeartPulse, Coffee, Car, Users, GlassWater, Package, Check, RefreshCcw, Waves, Minus, Plus, HelpCircle, AlertCircle, Home, RefreshCw as RefreshIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearchParams } from 'next/navigation';

type Plan = {
  id: string;
  name: string;
  monthlyFee: string;
  liters: string;
  refillFrequency: string;
  inclusions: string[];
  employees: string; // Represents "Persons" for household
  stations: string; // Represents "Gallons" for household
  isRecommended?: boolean;
};

export const gallonRotationData: { [key: string]: { gallons: number; notes: string } } = {
    'household-starter': { gallons: 6, notes: '2 in use, 1 in storage, 1 for delivery rotation' },
    'household-family': { gallons: 9, notes: '3 in use, 2 standby, 1 for refill rotation' },
    'micro': { gallons: 12, notes: '4 active use, 3 standby, 1 for rotation' },
    'starter': { gallons: 15, notes: '6 in use, 3 standby, 1 rotation' },
    'professional': { gallons: 23, notes: '8 in use, 5 standby, 2 for refill rotation' },
    'growth': { gallons: 30, notes: '10 in use, 7 standby, 3 for delivery rotation' },
    'pro': { gallons: 38, notes: '15 active, 7 standby, 3 for rotation/refill' },
    'business': { gallons: 53, notes: '20 active, 10 standby, 5 for rotation' },
    'enterprise-basic': { gallons: 75, notes: '30 active, 15 standby, 5 for rotation' },
    'enterprise-plus': { gallons: 113, notes: '45 active, 25 standby, 5 for rotation' },
    'enterprise-elite': { gallons: 150, notes: '60 active, 30 standby, 10 for rotation' },
    'enterprise-pro': { gallons: 180, notes: '70 active, 40 standby, 10 for rotation' },
    'custom-plan': { gallons: 0, notes: 'Dynamic allocation based on consumption. Rotation managed per branch or delivery station.' },
    'enterprise-customized': { gallons: 0, notes: 'Dynamic allocation. Rotation will be managed per branch or delivery station.' },
    'enterprise-overflow': { gallons: 0, notes: 'Dynamic allocation based on on-demand usage.' }
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
        description: 'Unused liters carry over to the next cycle. (For fixed plans only)',
    },
    {
        icon: <Thermometer className="h-5 w-5 text-primary" />,
        title: 'Free Dispensers, Gallons & Sanitary Items',
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

const householdPlans: Plan[] = [
    {
        id: 'household-starter',
        name: 'Starter',
        monthlyFee: '₱599',
        liters: '250 L',
        refillFrequency: '1/week',
        inclusions: [],
        employees: '1-3 Persons',
        stations: '~3 Gallons/week',
    },
    {
        id: 'household-family',
        name: 'Family',
        monthlyFee: '₱999',
        liters: '400 L',
        refillFrequency: '1-2/week',
        inclusions: [],
        employees: '3-5 Persons',
        stations: '~5 Gallons/week',
        isRecommended: true,
    },
];

const smePlans: Plan[] = [
  {
    id: 'micro',
    name: 'Micro',
    monthlyFee: '₱1,500',
    liters: '500 L',
    refillFrequency: '1–2/week',
    inclusions: [],
    employees: '5 – 10',
    stations: '1 Station',
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyFee: '₱3,000',
    liters: '1,000 L',
    refillFrequency: '2–3/week',
    inclusions: [],
    employees: '10 – 20',
    stations: '1 Station',
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyFee: '₱6,000',
    liters: '2,000 L',
    refillFrequency: '3–4/week',
    inclusions: [],
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
    inclusions: [],
    employees: '40 – 70',
    stations: '2 Stations',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyFee: '₱12,000',
    liters: '4,000 L',
    refillFrequency: '5–6/week',
    inclusions: [],
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
    inclusions: [],
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
        inclusions: [],
        employees: '150 – 250',
        stations: '2 – 3 Stations',
    },
    {
        id: 'enterprise-plus',
        name: 'Enterprise Plus',
        monthlyFee: '₱50,000',
        liters: '16,600 L',
        refillFrequency: '2–3/day',
        inclusions: [],
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
        inclusions: [],
        employees: '350 – 500',
        stations: '3 – 4 Stations',
    },
    {
        id: 'enterprise-pro',
        name: 'Enterprise Pro',
        monthlyFee: '₱100,000+',
        liters: '33,000+ L',
        refillFrequency: 'Continuous',
        inclusions: [],
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
        inclusions: ['Starts at ₱30,000 / month', 'Tailored setup, custom liters, flexible billing', 'Dedicated account manager'],
        employees: '—',
        stations: '5+ Verified Stations',
        isRecommended: true,
    },
    {
        id: 'enterprise-overflow',
        name: 'Enterprise Overflow',
        monthlyFee: '₱50,000',
        liters: 'Usage-Based',
        refillFrequency: 'Based on schedule',
        inclusions: [
            'Initial top-up of ₱50,000.',
            'Preferential rate of ₱2.50 per liter.',
            'Optional auto-top-up for seamless service.',
            'Real-time balance and usage tracking.'
        ],
        employees: '—',
        stations: '—',
    }
]

const customSmeCommercialPlan: Plan = {
    id: 'custom-plan',
    name: 'Customize Your Plan',
    monthlyFee: 'Custom',
    liters: 'Custom',
    refillFrequency: 'Custom',
    inclusions: ['Priced at ₱3.00 per liter', 'Perfect for unique consumption needs', 'All standard benefits included'],
    employees: '—',
    stations: '—',
};

export const allPlans = [...householdPlans, ...smePlans, ...commercialPlans, ...corporatePlans, ...flowPlans, customSmeCommercialPlan];

type BusinessSize = 'household' | 'sme' | 'commercial' | 'corporate' | 'enterprise';
type EnterpriseType = 'customized' | 'flowing';


export const deliveryFrequencies = [
    { value: 1, label: '1 time a week' },
    { value: 2, label: '2 times a week' },
    { value: 3, label: '3 times a week' },
    { value: 4, label: '4 times a week' },
    { value: 5, label: '5 times a week' },
    { value: 6, label: '6 times a week' },
    { value: 7, label: 'Daily' },
];

function CustomPlanCalculator({
    onCalculated,
}: {
    onCalculated: (values: { totalLiters: number, totalCost: number, deliveries: number, dispensers: number, containers: number, pricePerLiter: number }) => void;
}) {
    const [gallons, setGallons] = useState(10);
    const [deliveries, setDeliveries] = useState(1);
    const [pricePerLiter, setPricePerLiter] = useState(2.5);
    const [dispensers, setDispensers] = useState(1);
    const [containers, setContainers] = useState(5);
    const litersPerGallon = 19;

    const { totalLiters, totalCost } = useMemo(() => {
        const liters = gallons * deliveries * 4 * litersPerGallon;
        const cost = liters * pricePerLiter;
        return { totalLiters: liters, totalCost: cost ?? 0 };
    }, [gallons, deliveries, pricePerLiter]);
    
    useEffect(() => {
        onCalculated({ totalLiters, totalCost, deliveries, dispensers, containers, pricePerLiter });
    }, [totalLiters, totalCost, deliveries, dispensers, containers, pricePerLiter, onCalculated]);

    return (
        <div className="p-6 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="gallons" className="text-sm font-medium text-primary-foreground/80">5-Gallon Containers per Delivery</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground" onClick={() => setGallons(Math.max(1, gallons - 1))}><Minus className="h-4 w-4" /></Button>
                        <Input id="gallons" type="number" value={gallons} onChange={(e) => setGallons(parseInt(e.target.value) || 0)} className="text-center bg-transparent border-primary-foreground/50 text-primary-foreground placeholder:text-primary-foreground/60" />
                        <Button variant="outline" size="icon" className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground" onClick={() => setGallons(gallons + 1)}><Plus className="h-4 w-4" /></Button>
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
        </div>
    )
}

function FlowPlanConfigurator({
  onCalculated,
}: {
  onCalculated: (values: { locations: { name: string; dispensers: number; containers: number }[] }) => void;
}) {
  const [locations, setLocations] = useState([{ name: '', dispensers: 1, containers: 5 }]);
  const [newLocationName, setNewLocationName] = useState('');

  useEffect(() => {
    onCalculated({ locations });
  }, [locations, onCalculated]);

  const handleUpdateLocation = (index: number, field: 'name' | 'dispensers' | 'containers', value: string | number) => {
    const newLocations = [...locations];
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    if (field === 'name') {
        newLocations[index][field] = value as string;
    } else if (!isNaN(numValue) && numValue >= 0) {
        newLocations[index][field] = numValue;
    }
    setLocations(newLocations);
  };

  const handleAddLocation = () => {
    setLocations([...locations, { name: newLocationName || `Branch ${locations.length + 1}`, dispensers: 1, containers: 5 }]);
    setNewLocationName('');
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    setLocations(newLocations);
  };
  
  const totalDispensers = locations.reduce((sum, loc) => sum + loc.dispensers, 0);
  const totalContainers = locations.reduce((sum, loc) => sum + loc.containers, 0);

  return (
    <div className="p-6 space-y-6">
        <Card className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
            <CardHeader>
                <CardTitle className="text-base text-primary-foreground">Multi-Branch Equipment Setup</CardTitle>
                <CardDescription className="text-primary-foreground/80">Add each branch location and specify the required equipment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {locations.map((location, index) => (
                    <Card key={index} className="bg-primary-foreground/5 border-primary-foreground/10">
                        <CardHeader className="flex flex-row items-center justify-between p-4">
                             <Input 
                                value={location.name}
                                onChange={(e) => handleUpdateLocation(index, 'name', e.target.value)}
                                placeholder="Branch Name/Location"
                                className="text-base font-semibold bg-transparent border-0 border-b-2 border-primary-foreground/20 rounded-none focus-visible:ring-0 focus:border-primary-foreground/80 text-primary-foreground"
                            />
                            {locations.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLocation(index)} className="text-primary-foreground/60 hover:text-destructive hover:bg-destructive/20 h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 p-4 pt-0">
                            <div className="space-y-1">
                                <Label className="text-xs text-primary-foreground/80">Dispensers</Label>
                                <Input type="number" value={location.dispensers} onChange={(e) => handleUpdateLocation(index, 'dispensers', e.target.value)} className="bg-transparent border-primary-foreground/50 text-primary-foreground"/>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-primary-foreground/80">Containers</Label>
                                <Input type="number" value={location.containers} onChange={(e) => handleUpdateLocation(index, 'containers', e.target.value)} className="bg-transparent border-primary-foreground/50 text-primary-foreground"/>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                <Button onClick={handleAddLocation} variant="outline" className="w-full bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" /> Add Location
                </Button>
            </CardContent>
            <CardFooter className="p-4 bg-black/10 text-sm font-semibold flex justify-between">
                <span>Total Equipment:</span>
                <div className="text-right">
                    <p>{totalDispensers} Dispensers</p>
                    <p>{totalContainers} Containers</p>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}


function PlansGrid({ 
    plans, 
    defaultPlan, 
    selectedPlan, 
    onSelectPlan, 
    businessSize,
    customCalculatedValues,
    onCustomCalculated,
    overflowCalculatedValues,
    onOverflowCalculated,
    smeCommercialCustomValues,
    onSmeCommercialCustomCalculated
}: { 
    plans: Plan[], 
    defaultPlan: string, 
    selectedPlan: string | null, 
    onSelectPlan: (planId: string) => void, 
    businessSize: BusinessSize | null,
    customCalculatedValues: { totalLiters: number, totalCost: number, deliveries: number, locations: any[] } | null,
    onCustomCalculated: (values: any) => void;
    overflowCalculatedValues: { locations: { name: string; dispensers: number; containers: number; }[] } | null;
    onOverflowCalculated: (values: any) => void;
    smeCommercialCustomValues: { totalLiters: number, totalCost: number, deliveries: number, dispensers: number, containers: number, pricePerLiter: number } | null,
    onSmeCommercialCustomCalculated: (values: { totalLiters: number, totalCost: number, deliveries: number, dispensers: number, containers: number, pricePerLiter: number }) => void;
}) {
    const getStations = (liters: number) => {
        if (liters <= 2000) return '1 Station';
        if (liters <= 6000) return '2-3 Stations';
        if (liters <= 25000) return '3-4 Stations';
        return '5+ Stations';
    }

    const getEmployees = (liters: number, isHousehold: boolean) => {
        if (isHousehold) {
            const estimatedPeople = Math.round(liters / (2 * 30)); // Assuming 2L per person per day
            if (estimatedPeople <= 3) return '1-3';
            if (estimatedPeople <= 5) return '3-5';
            return '5+';
        }
        const estimatedEmployees = Math.round(liters / (2 * 22));
        if (estimatedEmployees < 5) return '< 5';
        if (estimatedEmployees > 500) return '500+';
        return `~${Math.round(estimatedEmployees / 10) * 10}`;
    };

    let gridColsClass = 'lg:grid-cols-3';
    if (businessSize === 'commercial') {
        gridColsClass = 'md:grid-cols-2';
    }
     if (businessSize === 'sme' || businessSize === 'household') {
        gridColsClass = 'md:grid-cols-2';
    }
     if (businessSize === 'corporate') {
        gridColsClass = 'lg:grid-cols-2';
    }
    
    const isSingleCustomPlan = businessSize === 'enterprise' && selectedPlan === 'enterprise-customized';
    const isSingleOverflowPlan = businessSize === 'enterprise' && selectedPlan === 'enterprise-overflow';
    const isSmeCommercialCustom = (businessSize === 'sme' || businessSize === 'household') && selectedPlan === 'custom-plan';

    const visiblePlans = useMemo(() => {
        if (isSmeCommercialCustom) {
            return plans.filter(p => p.id === 'custom-plan');
        }
        if (isSingleCustomPlan) {
            return plans.filter(p => p.id === 'enterprise-customized');
        }
        if (isSingleOverflowPlan) {
            return plans.filter(p => p.id === 'enterprise-overflow');
        }
        return plans;
    }, [plans, isSmeCommercialCustom, isSingleCustomPlan, isSingleOverflowPlan]);

    return (
    <RadioGroup
        value={selectedPlan ?? defaultPlan} 
        onValueChange={onSelectPlan}
        className={cn(
            "grid grid-cols-1 gap-6 items-start",
            gridColsClass,
            (isSingleCustomPlan || isSingleOverflowPlan || isSmeCommercialCustom) && 'md:grid-cols-1 lg:grid-cols-1'
        )}
    >
      {visiblePlans.map((plan) => {
        const isSelected = selectedPlan === plan.id;
        const isCustom = businessSize === 'enterprise' && (plan.id === 'enterprise-customized');
        const isOverflow = businessSize === 'enterprise' && (plan.id === 'enterprise-overflow');
        const isCustomSmeCommercial = (businessSize === 'sme' || businessSize === 'household') && (plan.id === 'custom-plan');
        const isDisabled = false;

        let employees = plan.employees;
        let stations = plan.stations;
        let monthlyFee = plan.monthlyFee;
        let liters = plan.liters;
        let refillFrequency = plan.refillFrequency;
        let inclusions = [...plan.inclusions];

        if (isCustom && customCalculatedValues) {
             const totalDispensers = customCalculatedValues.locations.reduce((sum, loc) => sum + loc.dispensers, 0);
            employees = `${customCalculatedValues.locations.length} Locations`;
            stations = `${totalDispensers} Dispensers`;
        }
        
        if (isOverflow && overflowCalculatedValues) {
            employees = `${overflowCalculatedValues.locations.length} Locations`;
            const totalDispensers = overflowCalculatedValues.locations.reduce((sum, loc) => sum + loc.dispensers, 0);
            stations = `${totalDispensers} Dispensers`;
            monthlyFee = '₱50,000';
            liters = `Usage-Based`;
            refillFrequency = `Based on schedule`;
        }


        if (isCustomSmeCommercial) {
            const pricePerLiter = smeCommercialCustomValues?.pricePerLiter || (businessSize === 'household' ? 2.5 : 3);
            inclusions[0] = `Priced at ₱${pricePerLiter.toFixed(2)} per liter`;
            if (smeCommercialCustomValues) {
                employees = getEmployees(smeCommercialCustomValues.totalLiters, businessSize === 'household');
                stations = getStations(smeCommercialCustomValues.totalLiters);
                monthlyFee = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(smeCommercialCustomValues.totalCost);
                liters = `${smeCommercialCustomValues.totalLiters.toLocaleString()} L`;
                const freq = deliveryFrequencies.find(f => f.value === smeCommercialCustomValues.deliveries);
                refillFrequency = freq ? freq.label : plan.refillFrequency;
            }
        }


        const cardContent = (
            <Label 
                htmlFor={plan.id} 
                className={cn(
                    "cursor-pointer h-full",
                    isDisabled && "cursor-not-allowed opacity-70"
                )}
            >
                <Card className={cn(
                    "relative flex flex-col h-full border-2 transition-all duration-300",
                    isSelected 
                    ? "border-primary shadow-lg bg-primary text-primary-foreground" 
                    : "bg-card text-card-foreground border shadow-md hover:border-primary/50",
                    isDisabled && "bg-muted text-muted-foreground"
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
                    <CardTitle className={cn("text-2xl", isSelected && !isDisabled && "text-primary-foreground")}>{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-2">
                        {plan.monthlyFee !== 'Custom' && <span className={cn("text-3xl font-bold", isSelected && !isDisabled && "text-primary-foreground")}>{monthlyFee}</span>}
                        {plan.name !== 'Enterprise Customized' && plan.monthlyFee !== 'Usage-Based' && !isOverflow && plan.id !== 'custom-plan' && <span className={cn("font-semibold", isSelected && !isDisabled ? 'text-primary-foreground/80' : 'text-muted-foreground')}>/ month</span>}
                        {isOverflow && <span className={cn("font-semibold", isSelected && !isDisabled ? 'text-primary-foreground/80' : 'text-muted-foreground')}>Top-up</span>}
                         {plan.monthlyFee === 'Usage-Based' && <span className={cn("font-semibold", isSelected && !isDisabled ? 'text-primary-foreground/80' : 'text-muted-foreground')}>Pay per Liter</span>}
                    </div>
                    </CardHeader>
                    <CardContent className="flex-1 text-left space-y-4">
                        <div className="space-y-2">
                            <p className={cn("text-sm font-semibold", isSelected && !isDisabled ? "text-primary-foreground/80" : "text-muted-foreground")}>{isCustomSmeCommercial ? 'Estimated Liters per Month' : 'Premium Liters Included'}</p>
                            <div className={cn("flex items-center gap-2 text-lg font-bold", isSelected && !isDisabled && "text-primary-foreground")}>
                                <span>{liters}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className={cn("text-sm font-semibold", isSelected && !isDisabled ? "text-primary-foreground/80" : "text-muted-foreground")}>Avg. Refill Frequency</p>
                            <div className={cn("flex items-center gap-2 text-lg font-bold", isSelected && !isDisabled && "text-primary-foreground")}>
                                <RefreshCcw className="h-5 w-5" />
                                <span>{refillFrequency}</span>
                            </div>
                        </div>
                         <ul className={cn('text-sm space-y-1 pl-4 list-disc', isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
                            {inclusions.map((inclusion) => <li key={inclusion}>{inclusion}</li>)}
                        </ul>
                    </CardContent>
                    
                    {plan.id === 'enterprise-customized' && isSelected && (
                        <FlowPlanConfigurator 
                           onCalculated={onCustomCalculated}
                        />
                    )}
                    
                    {plan.id === 'enterprise-overflow' && isSelected && (
                        <FlowPlanConfigurator 
                           onCalculated={onOverflowCalculated}
                        />
                    )}
                    
                    {plan.id === 'custom-plan' && isSelected && (
                         <CustomPlanCalculator
                            onCalculated={onSmeCommercialCustomCalculated}
                        />
                    )}


                    <CardFooter className={cn("p-4 rounded-b-lg", isSelected && !isDisabled ? "bg-black/20" : "bg-muted")}>
                        <div className="flex justify-between items-center w-full text-sm">
                            <div className={cn("flex items-center gap-2", isSelected && !isDisabled ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                {businessSize === 'household' ? <Home className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                <span className="font-semibold">{employees} {businessSize === 'household' ? 'Persons' : (isOverflow ? '' : 'Employees')}</span>
                            </div>
                            <div className={cn("flex items-center gap-2", isSelected && !isDisabled ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                {businessSize === 'household' ? <GlassWater className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                                <span className="font-semibold">{stations}</span>
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
        );

        if (isDisabled) {
            return (
                <TooltipProvider key={plan.id}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={cn('col-span-full')}>{cardContent}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>This is a usage-based plan. Please contact sales for a custom quote.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        const colSpanClass = (isCustom || isOverflow || isCustomSmeCommercial) && isSelected ? 'col-span-full' : 'col-span-1';

        return <div key={plan.id} className={cn(colSpanClass)}>{cardContent}</div>;
      })}
    </RadioGroup>
  );
}

const businessSizes = [
    { 
        id: 'household' as BusinessSize, 
        title: 'Family', 
        description: 'For families and personal home use.', 
        image: {
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FSmartRefill_Individual.png?alt=media&token=090d07c4-848a-4cd6-aab6-f7a5909ea839",
            description: "A modern kitchen with a water dispenser.",
            imageHint: "kitchen water"
        },
    },
    { 
        id: 'sme' as BusinessSize, 
        title: 'SME', 
        description: 'For small teams, kiosks, and home offices.', 
        image: {
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2FWater_Refill_SME.png?alt=media&token=e6beeb7b-3ed1-4e51-87cf-1b65b49041a1",
            description: "An office with a few people",
            imageHint: "small office"
        },
    }
];

const enterpriseTypes = [
    {
        id: 'customized' as EnterpriseType,
        title: 'Customized Plan',
        description: 'Tailored for predictable, prepaid enterprise solutions.',
        image: {
            imageUrl: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Overflow.png?alt=media&token=ad6cec25-c755-4de3-8276-430a013741b5',
            description: 'A person using a water dispenser.',
            imageHint: 'water dispenser',
        }
    },
    {
        id: 'flowing' as EnterpriseType,
        title: 'Flowing Plan',
        description: 'For pure usage-based, pay-as-you-go enterprise clients.',
        image: {
            imageUrl: 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FPlans%2Fwater_refill_Overflow.png?alt=media&token=ad6cec25-c755-4de3-8276-430a013741b5',
            description: 'Water flowing from a tap.',
            imageHint: 'water tap',
        }
    }
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
    const gridCols = isItemSelected ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';

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

function EnterpriseTypeSelector({
    selectedType,
    onSelectType,
}: {
    selectedType: EnterpriseType | null;
    onSelectType: (type: EnterpriseType) => void;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {enterpriseTypes.map((type) => (
                <Card
                    key={type.id}
                    onClick={() => onSelectType(type.id)}
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 overflow-hidden flex flex-col',
                        selectedType === type.id ? 'border-primary shadow-lg border-2' : ''
                    )}
                >
                    {type.image && (
                         <div className="relative aspect-video">
                            <Image
                                src={type.image.imageUrl}
                                alt={type.image.description}
                                fill
                                className="object-cover"
                                data-ai-hint={type.image.imageHint}
                            />
                        </div>
                    )}
                    <CardHeader className="flex-1">
                        <div>
                            <CardTitle>{type.title}</CardTitle>
                            <CardDescription>{type.description}</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
}


export default function PlansPage() {
    const searchParams = useSearchParams();
    const [selectedSize, setSelectedSize] = useState<BusinessSize | null>(null);
    const [selectedEnterpriseType, setSelectedEnterpriseType] = useState<EnterpriseType | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [customCalculatedValues, setCustomCalculatedValues] = useState<any>(null);
    const [overflowCalculatedValues, setOverflowCalculatedValues] = useState<{ locations: { name: string; dispensers: number; containers: number; }[] } | null>(null);
    const [smeCommercialCustomValues, setSmeCommercialCustomValues] = useState<{ totalLiters: number, totalCost: number, deliveries: number, dispensers: number, containers: number, pricePerLiter: number } | null>(null);
    
    useEffect(() => {
        const clientType = searchParams.get('clientType');
        if (clientType) {
            setSelectedSize(clientType as BusinessSize);
        }
    }, [searchParams]);

    const handleSizeSelect = (size: BusinessSize) => {
        setSelectedSize(size);
        setSelectedEnterpriseType(null); 
        setSelectedPlan(null); 
        setCustomCalculatedValues(null);
        setOverflowCalculatedValues(null);
        setSmeCommercialCustomValues(null);
    };

    const handleEnterpriseTypeSelect = (type: EnterpriseType) => {
        setSelectedEnterpriseType(type);
        if (type === 'customized') {
            setSelectedPlan('enterprise-customized');
        } else if (type === 'flowing') {
            setSelectedPlan('enterprise-overflow');
        }
    }

    const handlePlanSelect = (planId: string) => {
        const plan = allPlans.find(p => p.id === planId);
        setSelectedPlan(planId);
    }

    const handleCustomCalculated = useCallback((values: any) => {
        setCustomCalculatedValues(values);
    }, []);

    const handleOverflowCalculated = useCallback((values: any) => {
        setOverflowCalculatedValues(values);
    }, []);

    const handleSmeCommercialCustomCalculated = useCallback((values: { totalLiters: number, totalCost: number, deliveries: number, dispensers: number, containers: number, pricePerLiter: number }) => {
        setSmeCommercialCustomValues(values);
    }, []);

    const resetSelection = () => {
        setSelectedSize(null);
        setSelectedEnterpriseType(null);
        setSelectedPlan(null);
    }
    
    const renderPlans = () => {
        let plansToRender: Plan[] = [];
        let defaultPlanId = '';

        if (selectedSize === 'enterprise' && selectedEnterpriseType) {
            if (selectedEnterpriseType === 'customized') {
                 plansToRender = [flowPlans.find(p => p.id === 'enterprise-customized')!];
                 defaultPlanId = 'enterprise-customized';
            } else if (selectedEnterpriseType === 'flowing') {
                plansToRender = [flowPlans.find(p => p.id === 'enterprise-overflow')!];
                defaultPlanId = 'enterprise-overflow';
            }
        } else {
            switch (selectedSize) {
                case 'household':
                    plansToRender = [...householdPlans, { ...customSmeCommercialPlan, inclusions: [`Priced at ₱2.50 per liter`, ...customSmeCommercialPlan.inclusions.slice(1)] }];
                    defaultPlanId = 'household-family';
                    break;
                case 'sme':
                    plansToRender = [customSmeCommercialPlan];
                    defaultPlanId = 'custom-plan';
                    break;
                default:
                    return null;
            }
        }

        if (!plansToRender || plansToRender.length === 0) return null;

        return <PlansGrid 
                    plans={plansToRender} 
                    defaultPlan={defaultPlanId} 
                    selectedPlan={selectedPlan} 
                    onSelectPlan={handlePlanSelect} 
                    businessSize={selectedSize}
                    customCalculatedValues={customCalculatedValues}
                    onCustomCalculated={handleCustomCalculated}
                    overflowCalculatedValues={overflowCalculatedValues}
                    onOverflowCalculated={handleOverflowCalculated}
                    smeCommercialCustomValues={smeCommercialCustomValues}
                    onSmeCommercialCustomCalculated={handleSmeCommercialCustomCalculated}
                />;
    };
    
    const isNextDisabled = useMemo(() => {
        if (!selectedPlan) return true;
        if (selectedPlan === 'enterprise-customized') {
            if (!customCalculatedValues) return true;
            return false;
        }
        if (selectedPlan === 'enterprise-overflow') {
            return !overflowCalculatedValues || overflowCalculatedValues.locations.length === 0 || overflowCalculatedValues.locations.some(l => !l.name);
        }
        if (selectedPlan === 'custom-plan') {
            return !smeCommercialCustomValues || smeCommercialCustomValues.totalCost <= 0;
        }
        return false;
    }, [selectedPlan, customCalculatedValues, overflowCalculatedValues, smeCommercialCustomValues]);

    const getNextLink = () => {
        if (!selectedPlan) return '#';
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('plan', selectedPlan);
        
        if (selectedSize) {
          params.set('clientType', selectedSize);
        }

        if (selectedPlan === 'enterprise-customized' && customCalculatedValues) {
            params.set('locations', JSON.stringify(customCalculatedValues.locations));
        }
        if (selectedPlan === 'enterprise-overflow' && overflowCalculatedValues) {
            params.set('cost', '50000');
            params.set('locations', JSON.stringify(overflowCalculatedValues.locations));
        }
        if (selectedPlan === 'custom-plan' && smeCommercialCustomValues) {
            params.set('liters', smeCommercialCustomValues.totalLiters.toString());
            params.set('cost', smeCommercialCustomValues.totalCost.toString());
            params.set('freq', smeCommercialCustomValues.deliveries.toString());
            params.set('type', selectedSize || '');
            params.set('dispensers', smeCommercialCustomValues.dispensers.toString());
            params.set('containers', smeCommercialCustomValues.containers.toString());
        }
        return `/proposal/new/contract?${params.toString()}`;
    };

    const params = new URLSearchParams(searchParams.toString());
    const prevLink = `/proposal/new/about?${params.toString()}`;

    return (
        <div className="flex flex-col gap-6 pb-24 sm:pb-0">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-bold">Smart Refill - Subscription Model</h1>
            <p className="text-muted-foreground">
                Step 4: Select a Client Type, Choose a Plan & Review Inclusions
            </p>
            </div>
            <div className="hidden sm:flex flex-col sm:flex-row gap-2">
                <Button variant="outline" asChild>
                    <Link href={prevLink}>Previous</Link>
                </Button>
                <Button asChild={!isNextDisabled} disabled={isNextDisabled}>
                    <Link href={getNextLink()}>Next Step</Link>
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>1. Select Client Type</CardTitle>
                        <CardDescription>
                        Choose the client type to see the recommended plans.
                        </CardDescription>
                    </div>
                    {selectedSize && (
                        <Button variant="outline" onClick={resetSelection}>
                            <RefreshIcon className="mr-2 h-4 w-4" />
                            Change
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", selectedSize && "lg:grid-cols-[1fr,2fr]")}>
                    <div className={cn(selectedSize ? "lg:col-span-1" : "lg:col-span-2")}>
                        <BusinessSizeSelector 
                            selectedSize={selectedSize} 
                            onSelectSize={handleSizeSelect}
                            hiddenSizes={selectedSize ? businessSizes.map(s => s.id).filter(id => id !== selectedSize) : []}
                        />
                    </div>
                    {selectedSize && (
                        <div className="lg:col-span-1">
                             <Card>
                                <CardHeader>
                                    <CardTitle>
                                        2. Choose a Plan
                                    </CardTitle>
                                     <CardDescription>
                                        Select the best plan for your client from the options below.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {renderPlans()}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground text-center w-full">
                    Need high volume water supply? Reach out here: <a href="mailto:business@smartrefill.io" className="font-semibold text-primary hover:underline">business@smartrefill.io</a>
                 </p>
            </CardFooter>
        </Card>


        {selectedPlan && (
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
        )}

        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
            <div className="flex gap-2">
                <Button variant="outline" asChild className="flex-1">
                    <Link href={prevLink}>Previous</Link>
                </Button>
                <Button asChild={!isNextDisabled} disabled={isNextDisabled} className="flex-1">
                    <Link href={getNextLink()}>Next Step</Link>
                </Button>
            </div>
        </div>

        </div>
    );
}
