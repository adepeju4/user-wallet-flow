import type { 
  User, 
  Wallet, 
  Transaction, 
  PaymentSource, 
  Invoice,
  TransactionWithFormatted,
  WalletWithFormatted 
} from '../types';


export const currentUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  publicHandle: 'johndoe',
  cbCustomerId: 'cb_customer_john_doe',
  createdAt: '2024-01-15T10:30:00.000Z'
};


export const otherUsers: User[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '+1234567891',
    publicHandle: 'janesmith',
    cbCustomerId: 'cb_customer_jane_smith',
    createdAt: '2024-01-10T08:20:00.000Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'bob.wilson@example.com',
    firstName: 'Bob',
    lastName: 'Wilson',
    phoneNumber: '+1234567892',
    publicHandle: 'bobwilson',
    cbCustomerId: 'cb_customer_bob_wilson',
    createdAt: '2024-01-05T14:45:00.000Z'
  }
];


export const currentWallet: Wallet = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  userId: currentUser.id,
  balanceCents: BigInt(125500), 
  status: 'active',
  currency: 'USD',
  accountNumber: null,
  routingNumber: null,
  bankName: null,
  bankAddress: null,
  bankCountry: null,
  bankCurrency: null,
  cbVbaId: null,
  createdAt: '2024-01-15T10:35:00.000Z'
};


export const currentWalletFormatted: WalletWithFormatted = {
  ...currentWallet,
  balanceFormatted: '$1,255.00'
};


export const paymentSources: PaymentSource[] = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    userId: currentUser.id,
    provider: 'chargebee',
    type: 'card',
    externalId: 'pm_1234567890',
    displayName: 'Visa ending in 4242',
    isDefault: true
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    userId: currentUser.id,
    provider: 'chargebee',
    type: 'card',
    externalId: 'pm_0987654321',
    displayName: 'Mastercard ending in 8888',
    isDefault: false
  }
];


export const transactions: Transaction[] = [
  {
    id: '880e8400-e29b-41d4-a716-446655440001',
    userId: currentUser.id,
    walletId: currentWallet.id,
    type: 'TOPUP',
    status: 'SUCCEEDED',
    amountCents: BigInt(50000), 
    externalProvider: 'chargebee',
    externalRef: 'inv_1234567890',
    idempotencyKey: 'topup_key_001',
    clientRef: null,
    reversalOf: null,
    memo: 'Wallet top-up via card',
    createdAt: '2024-02-15T14:30:00.000Z'
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440002',
    userId: currentUser.id,
    walletId: currentWallet.id,
    type: 'TRANSFER_OUT',
    status: 'SUCCEEDED',
    amountCents: BigInt(15000), 
    externalProvider: 'internal_p2p',
    externalRef: 'p2p_1708012345_440001',
    idempotencyKey: 'transfer_key_001',
    clientRef: null,
    reversalOf: null,
    memo: 'Transfer to Jane Smith',
    createdAt: '2024-02-14T16:45:00.000Z'
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440003',
    userId: currentUser.id,
    walletId: currentWallet.id,
    type: 'TRANSFER_IN',
    status: 'SUCCEEDED',
    amountCents: BigInt(7500), 
    externalProvider: 'internal_p2p',
    externalRef: 'p2p_1707912345_440002',
    idempotencyKey: 'transfer_key_002',
    clientRef: null,
    reversalOf: null,
    memo: 'Transfer from Bob Wilson',
    createdAt: '2024-02-13T11:20:00.000Z'
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440004',
    userId: currentUser.id,
    walletId: currentWallet.id,
    type: 'TOPUP',
    status: 'PENDING',
    amountCents: BigInt(25000), 
    externalProvider: 'chargebee',
    externalRef: 'inv_0987654321',
    idempotencyKey: 'topup_key_002',
    clientRef: null,
    reversalOf: null,
    memo: 'Wallet top-up via bank transfer',
    createdAt: '2024-02-16T09:15:00.000Z'
  },
  {
    id: '880e8400-e29b-41d4-a716-446655440005',
    userId: currentUser.id,
    walletId: currentWallet.id,
    type: 'TRANSFER_OUT',
    status: 'FAILED',
    amountCents: BigInt(100000), 
    externalProvider: 'internal_p2p',
    externalRef: 'p2p_1708112345_440003',
    idempotencyKey: 'transfer_key_003',
    clientRef: null,
    reversalOf: null,
    memo: 'Failed transfer - insufficient funds',
    createdAt: '2024-02-12T13:30:00.000Z'
  }
];


export const transactionsWithFormatted: TransactionWithFormatted[] = transactions.map(tx => ({
  ...tx,
  amountFormatted: `$${(Number(tx.amountCents) / 100).toFixed(2)}`,
  ...(tx.type === 'TRANSFER_OUT' && tx.status === 'SUCCEEDED' && {
    recipientInfo: {
      name: 'Jane Smith',
      publicHandle: 'janesmith'
    }
  }),
  ...(tx.type === 'TRANSFER_IN' && tx.status === 'SUCCEEDED' && {
    senderInfo: {
      name: 'Bob Wilson',
      publicHandle: 'bobwilson'
    }
  })
}));


export const invoices: Invoice[] = [
  {
    id: '990e8400-e29b-41d4-a716-446655440001',
    userId: currentUser.id,
    cbInvoiceId: 'inv_1234567890',
    cbSubscriptionId: null,
    status: 'PAID',
    recurring: false,
    date: '2024-02-15T14:30:00.000Z',
    dueDate: '2024-02-20T14:30:00.000Z',
    subTotalCents: BigInt(50000),
    taxCents: BigInt(0),
    totalCents: BigInt(50000),
    amountPaidCents: BigInt(50000),
    amountDueCents: BigInt(0),
    amountAdjustedCents: BigInt(0),
    creditsAppliedCents: BigInt(0),
    amountToCollectCents: BigInt(0),
    currency: 'USD',
    exchangeRate: 1.0,
    paidAt: '2024-02-15T14:32:00.000Z',
    voidedAt: null,
    cbInvoiceUrl: 'https://chargebee.com/invoice/inv_1234567890',
    cbInvoicePdfUrl: 'https://chargebee.com/invoice/inv_1234567890.pdf',
    firstInvoice: false,
    termFinalized: true,
    priceType: 'tax_exclusive',
    cbIdempotencyKey: 'invoice_key_001',
    cbResourceVersion: BigInt(1),
    createdAt: '2024-02-15T14:30:00.000Z',
    updatedAt: '2024-02-15T14:32:00.000Z'
  },
  {
    id: '990e8400-e29b-41d4-a716-446655440002',
    userId: currentUser.id,
    cbInvoiceId: 'inv_0987654321',
    cbSubscriptionId: null,
    status: 'PAYMENT_DUE',
    recurring: false,
    date: '2024-02-16T09:15:00.000Z',
    dueDate: '2024-02-21T09:15:00.000Z',
    subTotalCents: BigInt(25000),
    taxCents: BigInt(0),
    totalCents: BigInt(25000),
    amountPaidCents: BigInt(0),
    amountDueCents: BigInt(25000),
    amountAdjustedCents: BigInt(0),
    creditsAppliedCents: BigInt(0),
    amountToCollectCents: BigInt(25000),
    currency: 'USD',
    exchangeRate: 1.0,
    paidAt: null,
    voidedAt: null,
    cbInvoiceUrl: 'https://chargebee.com/invoice/inv_0987654321',
    cbInvoicePdfUrl: null,
    firstInvoice: false,
    termFinalized: true,
    priceType: 'tax_exclusive',
    cbIdempotencyKey: 'invoice_key_002',
    cbResourceVersion: BigInt(1),
    createdAt: '2024-02-16T09:15:00.000Z',
    updatedAt: '2024-02-16T09:15:00.000Z'
  }
];


export const formatCurrency = (amountCents: bigint | number): string => {
  const amount = Number(amountCents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};


export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};
