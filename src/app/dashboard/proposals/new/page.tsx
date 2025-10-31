
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
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
import Link from 'next/link';

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
        <Button asChild>
          <Link href="/dashboard/proposals/new/about">Next Step</Link>
        </Button>
      </div>

      <div className="flex justify-center">
        <Card className="w-full lg:w-1/2">
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
      </div>
    </div>
  );
}
