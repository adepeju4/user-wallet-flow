
export type TxnType = 'TOPUP' | 'CHARGE' | 'REFUND' | 'WITHDRAW' | 'TRANSFER_IN' | 'TRANSFER_OUT';
export type TxnStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REVERSED' | 'CANCELLED';
export type InvoiceStatus = 'PENDING' | 'POSTED' | 'PAYMENT_DUE' | 'PAID' | 'NOT_PAID' | 'VOIDED';
export type LedgerSide = 'DEBIT' | 'CREDIT';


export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  publicHandle: string | null;
  cbCustomerId: string;
  createdAt: string;
}


export interface Wallet {
  id: string;
  userId: string;
  balanceCents: bigint;
  status: string;
  currency: string;
  accountNumber?: string | null;
  routingNumber?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
  bankCountry?: string | null;
  bankCurrency?: string | null;
  cbVbaId?: string | null;
  createdAt: string;
}


export interface PaymentSource {
  id: string;
  userId: string;
  provider: string;
  type: string;
  externalId: string;
  displayName: string | null;
  isDefault: boolean;
}


export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TxnType;
  status: TxnStatus;
  amountCents: bigint;
  externalProvider: string | null;
  externalRef: string | null;
  idempotencyKey: string | null;
  clientRef: string | null;
  reversalOf: string | null;
  memo: string | null;
  createdAt: string;
}


export interface Invoice {
  id: string;
  userId: string;
  cbInvoiceId: string;
  cbSubscriptionId: string | null;
  status: InvoiceStatus;
  recurring: boolean;
  date: string;
  dueDate: string | null;
  subTotalCents: bigint;
  taxCents: bigint;
  totalCents: bigint;
  amountPaidCents: bigint;
  amountDueCents: bigint;
  amountAdjustedCents: bigint;
  creditsAppliedCents: bigint;
  amountToCollectCents: bigint;
  currency: string;
  exchangeRate: number;
  paidAt: string | null;
  voidedAt: string | null;
  cbInvoiceUrl: string | null;
  cbInvoicePdfUrl: string | null;
  firstInvoice: boolean;
  termFinalized: boolean;
  priceType: string;
  cbIdempotencyKey: string | null;
  cbResourceVersion: bigint | null;
  createdAt: string;
  updatedAt: string;
}


export interface LedgerEntry {
  id: string;
  txnId: string;
  walletId: string | null;
  account: string;
  side: LedgerSide;
  amountCents: bigint;
  balanceAfterCents: bigint | null;
  createdAt: string;
}


export interface TransactionWithFormatted extends Transaction {
  amountFormatted: string;
  recipientInfo?: {
    name: string;
    publicHandle: string;
  };
  senderInfo?: {
    name: string;
    publicHandle: string;
  };
}

export interface WalletWithFormatted extends Wallet {
  balanceFormatted: string;
}
