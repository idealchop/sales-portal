export type Client = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'inactive' | 'lead';
  address: string;
  subscription?: {
    planId: string;
    planName: string;
    liters: number;
    amount: number;
    refillFrequency: string;
    employees: string;
    gallons: number;
    inclusions?: string[];
    addons?: string[];
  };
};

export type Proposal = {
  id: string;
  client: Pick<Client, 'id' | 'companyName' | 'contactName'>;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  amount: number;
  createdAt: string;
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
