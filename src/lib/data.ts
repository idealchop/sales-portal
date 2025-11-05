
import type { Client, Proposal, Revenue, OnboardingStep } from '@/lib/definitions';

const sampleOnboarding: OnboardingStep[] = [
    { title: 'Payment Confirmed', description: 'Initial subscription payment has been successfully processed.', status: 'completed', date: '2023-11-15' },
    { title: 'Account Activated', description: 'Client portal access has been granted.', status: 'completed', date: '2023-11-16' },
    { title: 'Onboarding Call', description: 'Initial setup and walkthrough call completed.', status: 'completed', date: '2023-11-17' },
    { title: 'First Delivery Scheduled', description: 'The first batch of water and equipment is scheduled for delivery.', status: 'pending', providerName: 'AquaPure Logistics', providerLocation: 'Pasig City' },
    { title: 'Automated Refills Enabled', description: 'The smart refill system is now active.', status: 'pending' },
];

const pendingOnboarding: OnboardingStep[] = [
    { title: 'Payment Confirmed', description: 'Initial subscription payment has been successfully processed.', status: 'completed', date: '2023-11-20' },
    { title: 'Account Activated', description: 'Client portal access has been granted.', status: 'pending' },
    { title: 'Onboarding Call', description: 'Initial setup and walkthrough call completed.', status: 'pending' },
    { title: 'First Delivery Scheduled', description: 'The first batch of water and equipment is scheduled for delivery.', status: 'pending' },
    { title: 'Automated Refills Enabled', description: 'The smart refill system is now active.', status: 'pending' },
];


export const clients: Client[] = [
  { id: 'SC24638991', companyName: 'Innovate Corp', contactName: 'John Doe', contactEmail: 'john.doe@innovate.com', contactPhone: '(0917) 123-4567', status: 'active', address: '123 Tech Lane, Silicon Valley, CA', remarks: [{ content: 'Client is very interested in our sustainability reports. Make sure to send them quarterly updates.', author: 'Sandra Adams', timestamp: '2023-10-15 10:30 AM' }], onboardingStatus: sampleOnboarding, subscription: { planId: 'professional', planName: 'Professional', liters: 2000, amount: 6000, refillFrequency: '3–4/week', employees: '20 – 40', gallons: 15, inclusions: ['2 Free Dispensers', 'Monthly Sanitation'], addons: ['Weekly Sanitation'], dateSigned: '2023-10-26' } },
  { id: 'SC24495882', companyName: 'Solutions Inc.', contactName: 'Jane Smith', contactEmail: 'jane.smith@solutions.com', contactPhone: '(0917) 234-5678', status: 'active', address: '456 Business Blvd, New York, NY', remarks: [{ content: 'Needs early morning deliveries only. Prefers contact via email.', author: 'Sandra Adams', timestamp: '2023-11-01 02:15 PM' }], onboardingStatus: sampleOnboarding, subscription: { planId: 'growth', planName: 'Growth', liters: 3000, amount: 9000, refillFrequency: '4–5/week', employees: '40 – 70', gallons: 20, inclusions: ['3 Free Dispensers', 'Monthly Sanitation'], dateSigned: '2023-11-05' } },
  { id: 'SC24389914', companyName: 'Synergy Group', contactName: 'Peter Jones', contactEmail: 'peter.jones@synergy.com', contactPhone: '(0917) 345-6789', status: 'inactive', address: '789 Enterprise Way, Chicago, IL', remarks: [{ content: 'Cancelled due to budget cuts. Might re-engage next year.', author: 'Admin', timestamp: '2023-08-20 11:00 AM' }] },
  { id: 'SC24958823', companyName: 'QuantumLeap Co.', contactName: 'Mary Johnson', contactEmail: 'mary.j@quantum.co', contactPhone: '(0917) 456-7890', status: 'active', address: '101 Future Drive, Austin, TX', onboardingStatus: sampleOnboarding, subscription: { planId: 'starter', planName: 'Starter', liters: 1000, amount: 3200, refillFrequency: '2–3/week', employees: '10 – 20', gallons: 10, inclusions: ['1 Free Dispenser', 'Monthly Sanitation'], dateSigned: '2023-11-12' } },
  { id: 'SC24899145', companyName: 'Apex Industries', contactName: 'David Wilson', contactEmail: 'david.w@apex.com', contactPhone: '(0917) 567-8901', status: 'active', address: '212 Summit Peak, Denver, CO', onboardingStatus: sampleOnboarding, subscription: { planId: 'pro', planName: 'Pro', liters: 4000, amount: 12000, refillFrequency: '5–6/week', employees: '70 – 100', gallons: 25, inclusions: ['3 Free Dispensers', 'Monthly Sanitation'], addons: ['Additional Dispenser (x1)'], dateSigned: '2023-09-15' } },
  { id: 'SC24588236', companyName: 'StriveEndeavors', contactName: 'Sarah Miller', contactEmail: 's.miller@strive.com', contactPhone: '(0917) 678-9012', status: 'pending', address: '333 Growth Ave, Miami, FL', remarks: [{ content: 'Awaiting payment confirmation. Follow up on Nov 22.', author: 'Sandra Adams', timestamp: '2023-11-20 09:00 AM' }], onboardingStatus: pendingOnboarding },
];

export const proposals: Proposal[] = [];

export const revenueData: Revenue[] = [
  { month: 'Jan', revenue: 350000 },
  { month: 'Feb', revenue: 375000 },
  { month: 'Mar', revenue: 425000 },
  { month: 'Apr', revenue: 400000 },
  { month: 'May', revenue: 450000 },
  { month: 'Jun', revenue: 480000 },
];
