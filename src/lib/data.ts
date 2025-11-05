
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


export const clients: Client[] = [];

export const proposals: Proposal[] = [];

export const revenueData: Revenue[] = [
  { month: 'Jan', revenue: 350000 },
  { month: 'Feb', revenue: 375000 },
  { month: 'Mar', revenue: 425000 },
  { month: 'Apr', revenue: 400000 },
  { month: 'May', revenue: 450000 },
  { month: 'Jun', revenue: 480000 },
];
