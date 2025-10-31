
import {
  User,
  Building,
  Mail,
  Phone,
  Users,
  GlassWater,
  Briefcase,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

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

      <div className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 md:p-8 space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="industry">Type of Industry</Label>
                      <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Select>
                              <SelectTrigger id="industry" className="pl-10">
                                  <SelectValue placeholder="Select an industry" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="tech">Technology</SelectItem>
                                  <SelectItem value="finance">Finance</SelectItem>
                                  <SelectItem value="health">Healthcare</SelectItem>
                                  <SelectItem value="retail">Retail</SelectItem>
                                  <SelectItem value="hospitality">Hospitality</SelectItem>
                                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <InputField
                    id="address"
                    label="Company Address"
                    icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                    placeholder="e.g., 123 Tech Lane, BGC, Taguig"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="relative h-48 mt-8">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Sales%20Portal%2FMarketing%20Mats%2FBG_Web_v2.png?alt=media&token=e944282b-6f8d-4cdd-8463-eeaf96746522"
              alt="background"
              layout="fill"
              objectFit="cover"
              objectPosition="bottom"
            />
          </div>
        </div>
    </div>
  );
}
