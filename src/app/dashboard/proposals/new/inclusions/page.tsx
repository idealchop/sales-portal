
import Link from 'next/link';
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
    Computer,
    CalendarClock,
    RotateCw,
    AreaChart,
    Thermometer,
    Wrench,
    CircleHelp,
    Rocket,
    Phone,
    HeartPulse,
    Coffee,
    Building,
    Car,
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

const perks = [
    {
        icon: <HeartPulse className="h-8 w-8 text-muted-foreground" />,
        partner: 'HealthFirst Clinic',
        benefit: '15% discount on annual physical exams for all employees.',
    },
    {
        icon: <Coffee className="h-8 w-8 text-muted-foreground" />,
        partner: 'The Daily Grind Cafe',
        benefit: '10% off on all bulk coffee bean orders for the office pantry.',
    },
    {
        icon: <Building className="h-8 w-8 text-muted-foreground" />,
        partner: 'FlexiSpace Co-Working',
        benefit: 'One free day pass per month at any FlexiSpace location nationwide.',
    },
    {
        icon: <Car className="h-8 w-8 text-muted-foreground" />,
        partner: 'EcoDrive Car Service',
        benefit: '20% discount on all corporate car wash and detailing services.',
    }
]

export default function InclusionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benefits and Inclusions</h1>
          <p className="text-muted-foreground">
            Step 5: A clear comparison against the traditional model.
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

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Included in Every Plan</CardTitle>
            <CardDescription>
                Smart Refill gives your business a complete, automated water operations system — designed for convenience, compliance, and continuous supply.
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
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Partner perks are available depending on the selected plan.
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partner Perks</CardTitle>
            <CardDescription>
              Exclusive benefits from our partners when you subscribe to any of our plans.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 sm:grid-cols-2">
            {perks.map((perk) => (
                <div key={perk.partner} className="flex items-start gap-4">
                    {perk.icon}
                    <div>
                        <h3 className="font-semibold">{perk.partner}</h3>
                        <p className="text-sm text-muted-foreground">{perk.benefit}</p>
                    </div>
                </div>
            ))}
          </CardContent>
           <CardFooter>
            <p className="text-sm text-muted-foreground">
                Terms: All employees of the subscribed company are eligible for these perks. To redeem, employees must present their company ID at partner establishments.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
