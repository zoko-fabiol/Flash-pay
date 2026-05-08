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
}

export type TransactionStatus = 'pending' | 'proof_received' | 'confirmed' | 'completed' | 'failed' | 'flagged_problem';

export interface StatusHistoryItem {
  status: TransactionStatus;
  timestamp: Timestamp;
  notes?: string;
}

export interface ProblemFlag {
  type: 'missing_proof' | 'wrong_amount' | 'operator_error' | 'other';
  reportedAt: Timestamp;
  description: string;
  resolved: boolean;
}

export interface BulkRecipient {
  id: string;
  name: string;
  amount: number;
  phone?: string;
  account?: string;
  operator?: string;
  status?: 'pending' | 'completed' | 'failed';
  validatedAt?: Timestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  type: 'russia-africa' | 'africa-russia' | 'russia-russia';
  status: TransactionStatus;
  isBulk?: boolean;
  bulkRecipients?: BulkRecipient[];
  amount: number;
  currency: string;
  fromCountry: string;
  toCountry: string;
  operator: string;
  proofUrl: string;
  createdAt: Timestamp;
  statusHistory: StatusHistoryItem[];
  originCountry?: string;
  destinationCountry?: string;
  destinationCurrency?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientOperator?: string;
  selectedOperator?: string;
  recipientAccount?: string;
  beneficiaryAccount?: string;
  narration?: string;
  route?: string;
  country?: string;
  adminNotes?: string;
  problemFlags?: ProblemFlag[];
  // Transaction calculation fields (snapshots at transaction time)
  exchangeRate?: number;
  exchangeRateTimestamp?: Timestamp;
  fee?: number;
  commissionPercentage?: number;
  receivedAmount?: number;
  points?: number;
}

export interface ExchangeRate {
  id: string;
  from: string;
  to: string;
  rate: number;
  updatedAt: Timestamp;
  updatedBy: string;
  source: 'manual' | 'api';
  margin: number;
}

export interface Commission {
  id: string;
  transferType: 'russia-russia' | 'russia-africa' | 'africa-russia';
  destinationCountry?: string; // e.g. 'CM'
  destinationOperator?: string; // e.g. 'Orange Money'
  feeType: 'percentage' | 'fixed';
  percentage?: number;
  fixedAmount?: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface DepositAccount {
  operator: string;
  number: string;
  holder: string;
  type: 'mobile_money' | 'bank_transfer';
  active: boolean;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  dialCode?: string;
  continent: 'africa' | 'europe';
  currency: string;
  operators: any[];
  banks: string[];
  depositAccounts: DepositAccount[];
  enabled: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
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

export interface UserProfile {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  adminRole?: 'super' | 'restricted' | 'email-only';
  adminPermissions?: AdminPermissions;
  kycStatus: KYCStatus;
  statut_kyc?: 'Standard' | 'Pending' | 'Expert' | 'Rejected';
  kyc?: KYCState;
}

export type AdminSectionKey =
  | 'dashboard'
  | 'queue'
  | 'users'
  | 'kyc'
  | 'countries'
  | 'settings'
  | 'problems'
  | 'notifications'
  | 'analytics'
  | 'security'
  | 'webhooks';

export type AdminActionKey = 'add' | 'edit' | 'delete';

export interface AdminPermissions {
  sections?: Partial<Record<AdminSectionKey, boolean>>;
  actions?: Partial<Record<AdminActionKey, boolean>>;
  receiveOrderEmails?: boolean;
}

export interface RussianBank {
  id: string;
  name: string;
  type: 'phone' | 'card_account';
  number: string;
  holder?: string;
  logo?: string;
  active: boolean;
}

export interface ProblemReport {
  id: string;
  transactionId: string;
  userId: string;
  type: 'missing_proof' | 'wrong_amount' | 'operator_error' | 'other';
  description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  adminNotes?: string;
}

export interface Operator {
  id: string;
  name: string;
  logo?: string;
  prefixes?: string[];
  active?: boolean;
}

// Transaction calculation recap for admin display
export interface TransactionRecap {
  originalAmount: number;
  inputCurrency: string;
  outputCurrency: string;
  exchangeRate: number;
  exchangeRateTimestamp: Timestamp;
  commissionPercentage: number;
  commissionAmount: number;
  amountAfterCommission: number;
  receivedAmount: number;
  route: 'russia-russia' | 'russia-africa' | 'africa-russia';
  isValid: boolean;
  errors?: string[];
}
