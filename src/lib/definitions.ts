export type Client = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  status: 'active' | 'inactive' | 'lead';
  address: string;
  consumptionData: number; // This is monthly consumption in liters
  subscription?: {
    planName: string;
    liters: number;
  };
};

export type Proposal = {
  id: string;
  client: Pick<Client, 'id' | 'companyName' | 'contactName'>;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  amount: number;
  createdAt: string;
};

export type Commission = {
  id: string;
  salesRep: string;
  clientName: string;
  proposalId: string;
  amount: number;
  commissionAmount: number;
  status: 'pending' | 'paid' | 'unpaid';
  date: string;
};

export type SalesMaterial = {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'image' | 'link';
  url: string;
  imageId: string;
};

export type Revenue = {
  month: string;
  revenue: number;
};
