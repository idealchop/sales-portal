

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

export type PaymentHistoryItem = {
    date: string;
    amount: number;
    proofUrl: string;
}

export type Client = {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'unpaid' | 'pending';
  address: string;
  clientType?: 'household' | 'sme' | 'commercial' | 'corporate' | 'enterprise';
  remarks?: Remark[];
  onboardingStatus?: OnboardingStep[];
  proposals?: Proposal[];
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
  paymentStatus?: 'Paid' | 'Pending' | 'Unpaid';
  paymentHistory?: PaymentHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type Proposal = {
  id: string;
  clientId: string;
  userId: string;
  client?: Pick<Client, 'id' | 'companyName' | 'contactName'>;
  title: string;
  content: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'finalized';
  amount: number;
  createdAt: string;
  paymentProofUrl?: string;
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
    phone?: string;
    role: 'sales' | 'admin' | 'manager';
    team?: string;
    birthday?: string;
    photoURL?: string;
    onboardingCompleted: boolean;
    createdAt?: string;
};

export type Commission = {
  id: string;
  proposalId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: string;
  type: 'commission' | 'bonus';
  description: string;
  referenceId: string;
  clientName?: string;
};
    
export type Notification = {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    type: 'payout' | 'announcement';
}
    



