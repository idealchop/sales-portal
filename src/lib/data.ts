import type { Client, Proposal, Revenue } from '@/lib/definitions';

export const clients: Client[] = [
  { id: 'SC24638991', companyName: 'Innovate Corp', contactName: 'John Doe', contactEmail: 'john.doe@innovate.com', contactPhone: '(0917) 123-4567', status: 'active', address: '123 Tech Lane, Silicon Valley, CA', subscription: { planId: 'professional', planName: 'Professional', liters: 2000, amount: 6000, refillFrequency: '3–4/week', employees: '20 – 40', gallons: 528, inclusions: ['2 Free Dispensers', 'Monthly Sanitation'], addons: ['Weekly Sanitation'] } },
  { id: 'SC24495882', companyName: 'Solutions Inc.', contactName: 'Jane Smith', contactEmail: 'jane.smith@solutions.com', contactPhone: '(0917) 234-5678', status: 'active', address: '456 Business Blvd, New York, NY', subscription: { planId: 'growth', planName: 'Growth', liters: 3000, amount: 9000, refillFrequency: '4–5/week', employees: '40 – 70', gallons: 792, inclusions: ['3 Free Dispensers', 'Monthly Sanitation'] } },
  { id: 'SC24389914', companyName: 'Synergy Group', contactName: 'Peter Jones', contactEmail: 'peter.jones@synergy.com', contactPhone: '(0917) 345-6789', status: 'inactive', address: '789 Enterprise Way, Chicago, IL' },
  { id: 'SC24958823', companyName: 'QuantumLeap Co.', contactName: 'Mary Johnson', contactEmail: 'mary.j@quantum.co', contactPhone: '(0917) 456-7890', status: 'lead', address: '101 Future Drive, Austin, TX' },
  { id: 'SC24899145', companyName: 'Apex Industries', contactName: 'David Wilson', contactEmail: 'david.w@apex.com', contactPhone: '(0917) 567-8901', status: 'active', address: '212 Summit Peak, Denver, CO', subscription: { planId: 'pro', planName: 'Pro', liters: 4000, amount: 12000, refillFrequency: '5–6/week', employees: '70 – 100', gallons: 1056, inclusions: ['3 Free Dispensers', 'Monthly Sanitation'], addons: ['Additional Dispenser (x1)'] } },
  { id: 'SC24588236', companyName: 'StriveEndeavors', contactName: 'Sarah Miller', contactEmail: 's.miller@strive.com', contactPhone: '(0917) 678-9012', status: 'lead', address: '333 Growth Ave, Miami, FL' },
];

export const proposals: Proposal[] = [
  { id: 'SR2023746382', client: { id: 'SC24638991', companyName: 'Innovate Corp', contactName: 'John Doe' }, status: 'accepted', amount: 6000, createdAt: '2023-10-26' },
  { id: 'SR2023826491', client: { id: 'SC24495882', companyName: 'Solutions Inc.', contactName: 'Jane Smith' }, status: 'sent', amount: 9000, createdAt: '2023-11-05' },
  { id: 'SR2023912374', client: { id: 'SC24958823', companyName: 'QuantumLeap Co.', contactName: 'Mary Johnson' }, status: 'draft', amount: 3200, createdAt: '2023-11-12' },
  { id: 'SR2023193847', client: { id: 'SC24899145', companyName: 'Apex Industries', contactName: 'David Wilson' }, status: 'rejected', amount: 12000, createdAt: '2023-09-15' },
  { id: 'SR2023182736', client: { id: 'SC24638991', companyName: 'Innovate Corp', contactName: 'John Doe' }, status: 'sent', amount: 8800, createdAt: '2023-11-18' },
];

export const revenueData: Revenue[] = [
  { month: 'Jan', revenue: 350000 },
  { month: 'Feb', revenue: 375000 },
  { month: 'Mar', revenue: 425000 },
  { month: 'Apr', revenue: 400000 },
  { month: 'May', revenue: 450000 },
  { month: 'Jun', revenue: 480000 },
];
