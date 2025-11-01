export type Client = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  status: 'active' | 'inactive' | 'lead';
  address: string;
  subscription?: {
    planName: string;
    liters: number;
    amount: number;
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
