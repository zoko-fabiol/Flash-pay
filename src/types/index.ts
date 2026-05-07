import { Timestamp } from 'firebase/firestore';

export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'blocked';

export interface KYCState {
  status: KYCStatus;
  submittedAt?: Timestamp;
  approvedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  rejectionCount?: number;
  rejectionReasons?: string[];
  lastRejectionDate?: Timestamp;
  nextEligibilityDate?: Timestamp;
  livenessScore?: number;
  adminNote?: string;
  blocked?: boolean;
}
export interface User {
  id: string;
  nom: string;
  email: string;
  tel: string;
  emailVerified?: boolean;
  statut_kyc: 'Standard' | 'Pending' | 'Expert' | 'Rejected';
  kyc?: KYCState;
  solde_bonus: number;
  referralCode?: string;
  referredUsers?: string[];
  referredBy?: string | null;
  referralStatus?: 'none' | 'pending' | 'rewarded';
  referralCodeUsed?: string;
  referralAppliedAt?: Timestamp;
  referralRewardedAt?: Timestamp;
  referralStats?: {
    invited: number;
    rewarded: number;
    pending: number;
  };
  referralRewards?: Array<{
    referredUserId: string;
    amount: number;
    type: string;
    awardedAt: Timestamp;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  receiverName: string;
  receiverPhone: string;
  amount: number;
  currency: 'EUR' | 'RUB' | 'XAF';
  fee: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  route: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receiver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  country: string;
  operator: string;
  createdAt: Date;
}

export interface ReferralData {
  userId: string;
  referralCode: string;
  referredUsers: string[];
  totalBonus: number;
  invitedCount?: number;
  rewardedCount?: number;
  pendingCount?: number;
  referrals?: Array<{
    id: string;
    referrerId: string;
    referredUserId: string;
    referralCode: string;
    status: 'pending' | 'rewarded' | 'cancelled';
    bonusAmount: number;
    createdAt: Timestamp;
    rewardedAt?: Timestamp | null;
    rewardReason?: string | null;
  }>;
  createdAt: Date;
}

export interface KYCRequest {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  status: 'pending' | 'approved' | 'rejected';
  documents: {
    idProof: { url: string; type: string; uploadedAt: Timestamp };
    addressProof: { url: string; type: string; uploadedAt: Timestamp };
    selfie: { url: string; uploadedAt: Timestamp };
    localProof?: { url: string; type: string; uploadedAt: Timestamp };
  };
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  notes?: string;
  rejectionCount?: number;
  blocked?: boolean;
  blockedUntil?: Timestamp;
  history?: Array<{
    action: 'submitted' | 'approved' | 'rejected';
    timestamp: Timestamp;
    actor: string;
    reason?: string;
  }>;
}

export interface Settings {
  rate_eur_xaf: number;
  rate_rub_xaf: number;
  feePercentage: number;
  referralBonus?: number;
}

export interface Operator {
  name: string;
  prefixes: string[];
  color: string;
}

export interface Country {
  name: string;
  dialCode: string;
  operators: Operator[];
  deposit?: string;
}
