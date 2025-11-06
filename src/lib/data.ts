
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
  {
    id: '1',
    companyName: 'Innovate Inc.',
    contactName: 'Alice Johnson',
    contactEmail: 'alice.j@innovate.com',
    contactPhone: '0917-123-4567',
    status: 'active',
    address: '123 Innovation Drive, BGC, Taguig',
    clientType: 'corporate',
    onboardingStatus: sampleOnboarding,
    subscription: {
        planId: 'enterprise-plus',
        planName: 'Enterprise Plus',
        liters: 16600,
        amount: 50000,
        refillFrequency: '2-3/day',
        employees: '250-350',
        gallons: 75,
        dateSigned: '2023-11-15',
    }
  },
  {
    id: '2',
    companyName: 'Solutions Co.',
    contactName: 'Bob Williams',
    contactEmail: 'bob.w@solutions.co',
    contactPhone: '0918-234-5678',
    status: 'pending',
    address: '456 Solution Ave, Ortigas, Pasig',
    clientType: 'sme',
    onboardingStatus: pendingOnboarding,
    subscription: {
        planId: 'professional',
        planName: 'Professional',
        liters: 2000,
        amount: 6000,
        refillFrequency: '3-4/week',
        employees: '20-40',
        gallons: 15,
        dateSigned: '2023-11-20',
    }
  },
  {
    id: '3',
    companyName: 'Global Ventures',
    contactName: 'Charlie Brown',
    contactEmail: 'charlie.b@global.com',
    contactPhone: '0919-345-6789',
    status: 'inactive',
    address: '789 Global St, Makati CBD, Makati',
    clientType: 'commercial',
  },
];

export const proposals: Proposal[] = [
  {
    id: 'PROP-001',
    clientId: '1',
    client: { id: '1', companyName: 'Innovate Inc.', contactName: 'Alice Johnson' },
    title: 'Water Supply Proposal for Innovate Inc.',
    content: '{"plan":{"id":"enterprise-plus","name":"Enterprise Plus","monthlyFee":"₱50,000","liters":"16,600 L","refillFrequency":"2–3/day","inclusions":[],"employees":"250 – 350","stations":"2 – 3 Stations","isRecommended":true},"summaryTitle":"Enterprise Plus Plan","totalLiters":"19920 L","totalAmountDue":"₱50,000.00","billingCycleLabel":"Monthly","basePrice":50000,"date":"November 21, 2023"}',
    status: 'accepted',
    amount: 50000.00,
    createdAt: '2023-11-20T10:00:00Z',
  },
  {
    id: 'PROP-002',
    clientId: '2',
    client: { id: '2', companyName: 'Solutions Co.', contactName: 'Bob Williams' },
    title: 'Q4 Proposal for Solutions Co.',
    content: '{"plan":{"id":"professional","name":"Professional","monthlyFee":"₱6,000","liters":"2,000 L","refillFrequency":"3–4/week","inclusions":[],"employees":"20 – 40","stations":"1 Station","isRecommended":true},"summaryTitle":"Professional Plan","totalLiters":"2400 L","totalAmountDue":"₱6,000.00","billingCycleLabel":"Monthly","basePrice":6000,"date":"November 21, 2023"}',
    status: 'sent',
    amount: 6000.00,
    createdAt: '2023-11-18T14:30:00Z',
  },
  {
    id: 'PROP-003',
    clientId: '3',
    client: { id: '3', companyName: 'Global Ventures', contactName: 'Charlie Brown' },
    title: 'Initial Draft for Global Ventures',
    content: '{"plan":{"id":"growth","name":"Growth","monthlyFee":"₱9,000","liters":"3,000 L","refillFrequency":"4–5/week","inclusions":[],"employees":"40 – 70","stations":"2 Stations"},"summaryTitle":"Growth Plan","totalLiters":"3600 L","totalAmountDue":"₱9,000.00","billingCycleLabel":"Monthly","basePrice":9000,"date":"November 21, 2023"}',
    status: 'draft',
    amount: 9000.00,
    createdAt: '2023-11-21T09:00:00Z',
  },
  {
    id: 'PROP-004',
    clientId: '1',
    client: { id: '1', companyName: 'Innovate Inc.', contactName: 'Alice Johnson' },
    title: 'New Branch Expansion Proposal',
    content: '{"plan":{"id":"business","name":"Business","monthlyFee":"₱18,000","liters":"6,000 L","refillFrequency":"Daily","inclusions":[],"employees":"100 – 150","stations":"2 – 3 Stations"},"summaryTitle":"Business Plan","totalLiters":"7200 L","totalAmountDue":"₱18,000.00","billingCycleLabel":"Monthly","basePrice":18000,"date":"November 21, 2023"}',
    status: 'finalized',
    amount: 18000.00,
    createdAt: '2023-11-22T11:00:00Z',
  },
];

export const revenueData: Revenue[] = [
  { month: 'Jan', revenue: 350000 },
  { month: 'Feb', revenue: 375000 },
  { month: 'Mar', revenue: 425000 },
  { month: 'Apr', revenue: 400000 },
  { month: 'May', revenue: 450000 },
  { month: 'Jun', revenue: 480000 },
];
