

export type OnboardingStep = {
  title: string;
  status: 'completed' | 'pending';
  date?: string;
};

export type Remark = {
  content: string;
  author: string;
  timestamp: string;
};

export type Client = {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'inactive' | 'pending';
  address: string;
  remarks?: Remark[];
  onboardingStatus?: OnboardingStep[];
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
