
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileText,
  User,
  Building,
  Mail,
  Phone,
  Users,
  GlassWater,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SmartRefillIntro() {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>What is Smart Refill?</CardTitle>
        <CardDescription>
          An overview of the value proposition.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm text-muted-foreground prose">
        <p className="font-semibold text-foreground">
          Smart Refill is the Philippines’ first automated water refill system
          for businesses — built to make water supply safe, seamless, and
          scalable.
        </p>
        <p>
          We connect businesses directly to a nationwide network of verified and
          compliant local water refilling stations, ensuring every delivery is
          automatic, on time, and fully compliant with sanitation and water
          quality standards.
        </p>
        <p>
          With Smart Refill, businesses no longer need to worry about reordering
          water — refills are delivered automatically. You can easily monitor
          consumption, providers, and payments, and scale your operations
          anytime, all through one Smart Refill Client Portal.
        </p>

        <div>
          <h3 className="font-semibold text-foreground text-base">
            🌐 Nationwide, Reliable, and Fully Automated
          </h3>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>100+ Partner Refilling Stations and growing</li>
            <li>500+ Refilling Station App Users</li>
            <li>Thousands of liters delivered weekly across the Philippines</li>
            <li>Zero downtime — continuous, automated water refills</li>
            <li>100% compliance rate from verified partners</li>
          </ul>
        </div>

        <div>
            <h3 className="font-semibold text-foreground text-base">⚙️ What We Do</h3>
            <p className="mt-2">Smart Refill powers your business with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Automated Refills – No more texts, calls, or manual orders.</li>
                <li>Nationwide Access – Refill anywhere in the Philippines with verified partners.</li>
                <li>Centralized Dashboard – Monitor water usage, billing, and deliveries in real time.</li>
                <li>Compliance Assurance – Every refill meets sanitation and safety standards.</li>
                <li>Scalable Plans – Flexible liters and billing for every business size.</li>
            </ul>
        </div>

        <p className="font-semibold text-foreground text-center pt-4">
            Smart Refill — Safe. Automated. Simplified.
        </p>
         <p className="text-center">
            We handle the refills. You handle the business.
        </p>

      </CardContent>
    </Card>
  );
}

function InputField({
  id,
  label,
  icon,
  ...props
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </div>
        <Input id={id} className="pl-10" {...props} />
      </div>
    </div>
  );
}


export default function NewProposalPage() {
  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">Create a New Proposal</h1>
            <p className="text-muted-foreground">
                Step 1: Enter Client Information
            </p>
        </div>
        <Button>Next Step</Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="w-full lg:w-1/3">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>
              Enter the prospective client's information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputField
              id="company-name"
              label="Company Name"
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., Innovate Corp"
            />
             <InputField
              id="contact-name"
              label="Contact Person"
              icon={<User className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., John Doe"
            />
            <InputField
              id="email"
              label="Email Address"
              type="email"
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., john.doe@example.com"
            />
            <InputField
              id="phone"
              label="Phone Number"
              type="tel"
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., (0917) 123 4567"
            />
             <InputField
              id="address"
              label="Company Address"
              icon={<Building className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., 123 Tech Lane, BGC"
            />
            <InputField
              id="employees"
              label="Number of Employees"
              type="number"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., 50"
            />
            <InputField
              id="bottles"
              label="Estimated Bottles per Month"
              type="number"
              icon={<GlassWater className="h-4 w-4 text-muted-foreground" />}
              placeholder="e.g., 100"
            />
          </CardContent>
        </Card>

        <SmartRefillIntro />

      </div>
    </div>
  );
}
