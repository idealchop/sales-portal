import type { Client, Commission, Proposal, Revenue } from '@/lib/definitions';

export const clients: Client[] = [
  { id: '1', companyName: 'Innovate Corp', contactName: 'John Doe', contactEmail: 'john.doe@innovate.com', status: 'active', address: '123 Tech Lane, Silicon Valley, CA', consumptionData: 1500 },
  { id: '2', companyName: 'Solutions Inc.', contactName: 'Jane Smith', contactEmail: 'jane.smith@solutions.com', status: 'active', address: '456 Business Blvd, New York, NY', consumptionData: 2200 },
  { id: '3', companyName: 'Synergy Group', contactName: 'Peter Jones', contactEmail: 'peter.jones@synergy.com', status: 'inactive', address: '789 Enterprise Way, Chicago, IL', consumptionData: 800 },
  { id: '4', companyName: 'QuantumLeap Co.', contactName: 'Mary Johnson', contactEmail: 'mary.j@quantum.co', status: 'lead', address: '101 Future Drive, Austin, TX', consumptionData: 300 },
  { id: '5', companyName: 'Apex Industries', contactName: 'David Wilson', contactEmail: 'david.w@apex.com', status: 'active', address: '212 Summit Peak, Denver, CO', consumptionData: 3100 },
  { id: '6', companyName: 'StriveEndeavors', contactName: 'Sarah Miller', contactEmail: 's.miller@strive.com', status: 'lead', address: '333 Growth Ave, Miami, FL', consumptionData: 500 },
];

export const proposals: Proposal[] = [
  { id: 'P001', client: { id: '1', companyName: 'Innovate Corp', contactName: 'John Doe' }, status: 'accepted', amount: 5000, createdAt: '2023-10-26' },
  { id: 'P002', client: { id: '2', companyName: 'Solutions Inc.', contactName: 'Jane Smith' }, status: 'sent', amount: 7500, createdAt: '2023-11-05' },
  { id: 'P003', client: { id: '4', companyName: 'QuantumLeap Co.', contactName: 'Mary Johnson' }, status: 'draft', amount: 3200, createdAt: '2023-11-12' },
  { id: 'P004', client: { id: '5', companyName: 'Apex Industries', contactName: 'David Wilson' }, status: 'rejected', amount: 12000, createdAt: '2023-09-15' },
  { id: 'P005', client: { id: '1', companyName: 'Innovate Corp', contactName: 'John Doe' }, status: 'sent', amount: 8800, createdAt: '2023-11-18' },
];

export const commissions: Commission[] = [
    { id: 'C001', salesRep: 'Alice Johnson', clientName: 'Innovate Corp', proposalId: 'P001', amount: 5000, commissionAmount: 500, status: 'paid', date: '2023-11-01' },
    { id: 'C002', salesRep: 'Bob Williams', clientName: 'MegaCorp', proposalId: 'P00X', amount: 15000, commissionAmount: 1500, status: 'pending', date: '2023-11-20' },
    { id: 'C003', salesRep: 'Alice Johnson', clientName: 'Global Solutions', proposalId: 'P00Y', amount: 9500, commissionAmount: 950, status: 'unpaid', date: '2023-10-15' },
    { id: 'C004', salesRep: 'Charlie Brown', clientName: 'TechPioneers', proposalId: 'P00Z', amount: 25000, commissionAmount: 2500, status: 'paid', date: '2023-09-30' },
];

export const revenueData: Revenue[] = [
  { month: 'Jan', revenue: 350000 },
  { month: 'Feb', revenue: 375000 },
  { month: 'Mar', revenue: 425000 },
  { month: 'Apr', revenue: 400000 },
  { month: 'May', revenue: 450000 },
  { month: 'Jun', revenue: 480000 },
];
