
export type OnboardingStep = {
  title: string;
  description: string;
  status: 'completed' | 'pending';
  date?: string;
  providerName?: string;
  providerLocation?: string;
};

export type Remark = {
  content: string;
  author: string;
  timestamp: string;
};

export type Plan = {
  id: string;
  name: string;
  monthlyFee: string;
  liters: string;
  refillFrequency: string;
  inclusions: string[];
  employees: string; // Represents "People" for household
  stations: string; // Represents "Gallons" for household
  isRecommended?: boolean;
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
    dateSigned?: string;
  };
};

export type Proposal = {
  id: string;
  clientId: string;
  client?: Pick<Client, 'id' | 'companyName' | 'contactName'>;
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

export type UserProfile = {
    id: string;
    email: string;
    displayName: string;
    role: 'sales' | 'admin';
    team?: string;
    birthday?: string;
    photoURL?: string;
    onboardingCompleted: boolean;
};
