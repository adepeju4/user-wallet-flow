import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  currentWalletFormatted,
  transactionsWithFormatted,
  otherUsers,
  formatCurrency,
} from '@/utils/dummyData';
import type { TransactionWithFormatted, WalletWithFormatted } from '@/types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Send,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface TransactionState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId: string;
    amount: number;
    recipient?: string;
  };
}

type TabKey = 'overview' | 'transfer' | 'topup';

export default function WalletDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [wallet, setWallet] = useState<WalletWithFormatted>(currentWalletFormatted);
  const [transactions, setTransactions] = useState(transactionsWithFormatted);

  // Form states
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [topupAmount, setTopupAmount] = useState('');

  // Transaction states
  const [transferState, setTransferState] = useState<TransactionState>({
    isLoading: false,
    error: null,
    success: null,
  });
  const [topupState, setTopupState] = useState<TransactionState>({
    isLoading: false,
    error: null,
    success: null,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Checking for updates...');
    }, 10000); // In real life, this should be a socket io implementation or a more sophisticated polling mechanism

    return () => clearInterval(interval);
  }, []);

  const validateTransferAmount = (amount: string): string | null => {
    const numericAmount = parseFloat(amount);
    const walletBalanceInDollars = Number(wallet.balanceCents) / 100;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return 'Please enter a valid amount';
    }
    if (numericAmount > walletBalanceInDollars) {
      return `Insufficient funds. Available balance: ${
        wallet.balanceFormatted
      } (${walletBalanceInDollars.toFixed(2)})`;
    }

    if (numericAmount < 0.01) {
      return 'Minimum transfer amount is $0.01';
    }

    const amountInCents = Math.round(numericAmount * 100);
    if (amountInCents > Number(wallet.balanceCents)) {
      return `Insufficient funds. Available: ${Number(
        wallet.balanceCents
      )} cents, Requested: ${amountInCents} cents`;
    }

    return null;
  };

  const validateTopupAmount = (amount: string): string | null => {
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return 'Please enter a valid amount';
    }

    if (numericAmount < 1) {
      return 'Minimum top-up amount is $1.00';
    }

    if (numericAmount > 10000) {
      return 'Maximum top-up amount is $10,000.00';
    }

    const amountInCents = Math.round(numericAmount * 100);
    if (amountInCents !== numericAmount * 100) {
      return 'Amount must not have more than 2 decimal places';
    }

    return null;
  };

  const simulateApiCall = async (
    operation: string,
    amount: number,
    recipient?: string
  ): Promise<ApiResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (Math.random() < 0.2) {
      throw new Error('Network error: Unable to process transaction. Please try again.');
    }

    const amountInCents = Math.round(amount * 100);
    const walletBalanceInCents = Number(wallet.balanceCents);

    if (operation === 'transfer' && amountInCents > walletBalanceInCents) {
      throw new Error(
        `Insufficient funds. Required: ${amountInCents} cents, Available: ${walletBalanceInCents} cents`
      );
    }

    return {
      success: true,
      message: `${operation} of ${formatCurrency(amount)} completed successfully`,
      data: {
        transactionId: `txn_${Date.now()}`,
        amount,
        recipient,
      },
    };
  };

  const handleTransfer = async () => {
    const amountError = validateTransferAmount(transferAmount);
    if (amountError) {
      setTransferState({ isLoading: false, error: amountError, success: null });
      return;
    }

    if (!transferRecipient) {
      setTransferState({ isLoading: false, error: 'Please select a recipient', success: null });
      return;
    }

    setTransferState({ isLoading: true, error: null, success: null });

    try {
      const amount = parseFloat(transferAmount);
      const amountInCents = Math.round(amount * 100);

      console.log(`Transfer Debug:
        Amount (dollars): ${amount}
        Amount (cents): ${amountInCents}
        Current balance (cents): ${Number(wallet.balanceCents)}
        Recipient: ${transferRecipient}
      `);

      const result = await simulateApiCall('transfer', amount, transferRecipient);

      const currentBalanceCents = wallet.balanceCents;
      const newBalanceCents = currentBalanceCents - BigInt(amountInCents);

      console.log(`Balance Update:
        Current: ${Number(currentBalanceCents)} cents
        Deducting: ${amountInCents} cents
        New balance: ${Number(newBalanceCents)} cents
        New balance (dollars): ${Number(newBalanceCents) / 100}
      `);

      setWallet(prev => ({
        ...prev,
        balanceCents: newBalanceCents,
        balanceFormatted: formatCurrency(Number(newBalanceCents) / 100),
      }));

      const newTransaction: TransactionWithFormatted = {
        id: result.data!.transactionId,
        userId: 'current-user',
        walletId: wallet.id,
        type: 'TRANSFER_OUT',
        status: 'SUCCEEDED',
        amountCents: BigInt(amountInCents),
        amountFormatted: formatCurrency(amount),
        externalProvider: null,
        externalRef: null,
        idempotencyKey: null,
        clientRef: null,
        reversalOf: null,
        memo: `Transfer to ${transferRecipient}`,
        createdAt: new Date().toISOString(),
      };

      setTransactions(prev => [newTransaction, ...prev]);

      setTransferAmount('');
      setTransferRecipient('');
      setTransferState({
        isLoading: false,
        error: null,
        success: result.message,
      });

      setTimeout(() => {
        setTransferState(prev => ({ ...prev, success: null }));
      }, 5000);
    } catch (error) {
      setTransferState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
        success: null,
      });
    }
  };

  const handleTopup = async () => {
    const amountError = validateTopupAmount(topupAmount);
    if (amountError) {
      setTopupState({ isLoading: false, error: amountError, success: null });
      return;
    }

    setTopupState({ isLoading: true, error: null, success: null });

    try {
      const amount = parseFloat(topupAmount);
      const amountInCents = Math.round(amount * 100);

      console.log(`Topup Debug:
        Amount (dollars): ${amount}
        Amount (cents): ${amountInCents}
        Current balance (cents): ${Number(wallet.balanceCents)}
      `);

      const result = await simulateApiCall('topup', amount);

      const currentBalanceCents = wallet.balanceCents;
      const newBalanceCents = currentBalanceCents + BigInt(amountInCents);

      console.log(`Balance Update:
        Current: ${Number(currentBalanceCents)} cents
        Adding: ${amountInCents} cents
        New balance: ${Number(newBalanceCents)} cents
        New balance (dollars): ${Number(newBalanceCents) / 100}
      `);

      setWallet(prev => ({
        ...prev,
        balanceCents: newBalanceCents,
        balanceFormatted: formatCurrency(Number(newBalanceCents) / 100),
      }));

      const newTransaction: TransactionWithFormatted = {
        id: result.data!.transactionId,
        userId: 'current-user',
        walletId: wallet.id,
        type: 'TOPUP',
        status: 'SUCCEEDED',
        amountCents: BigInt(amountInCents),
        amountFormatted: formatCurrency(amount),
        externalProvider: null,
        externalRef: null,
        idempotencyKey: null,
        clientRef: null,
        reversalOf: null,
        memo: 'Wallet top-up',
        createdAt: new Date().toISOString(),
      };

      setTransactions(prev => [newTransaction, ...prev]);

      setTopupAmount('');
      setTopupState({
        isLoading: false,
        error: null,
        success: result.message,
      });

      setTimeout(() => {
        setTopupState(prev => ({ ...prev, success: null }));
      }, 5000);
    } catch (error) {
      setTopupState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Top-up failed',
        success: null,
      });
    }
  };

  const getTransactionIcon = (transaction: TransactionWithFormatted) => {
    switch (transaction.type) {
      case 'TRANSFER_IN':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'TRANSFER_OUT':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'TOPUP':
        return <Plus className="h-4 w-4 text-blue-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const AlertMessage = ({
    state,
    type,
  }: {
    state: TransactionState;
    type: 'error' | 'success';
  }) => {
    const message = type === 'error' ? state.error : state.success;
    if (!message) return null;

    return (
      <div
        className={`flex items-center gap-2 p-3 rounded-md ${
          type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}
      >
        {type === 'error' ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        <span className="text-sm">{message}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
          <p className="text-gray-600 mt-2">Manage your finances with real-time updates</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-gray-900">Current Balance</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Balance
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{wallet.balanceFormatted}</div>
            <div className="text-sm text-gray-500 mb-2">
              Balance in cents: {Number(wallet.balanceCents).toLocaleString()} cents
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date().toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <div className="flex border-b">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'transfer', label: 'Send Money' },
            { key: 'topup', label: 'Top Up' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest wallet activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.slice(0, 10).map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction)}
                      <div>
                        <p className="font-medium">{transaction.memo || 'Transaction'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          transaction.type === 'TRANSFER_OUT' ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {transaction.type === 'TRANSFER_OUT' ? '-' : '+'}
                        {transaction.amountFormatted}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(
                          transaction.status
                        )}`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'transfer' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Money
              </CardTitle>
              <CardDescription>Available balance: {wallet.balanceFormatted}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertMessage state={transferState} type="error" />
              <AlertMessage state={transferState} type="success" />

              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  disabled={transferState.isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Recipient</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={transferRecipient}
                  onChange={e => setTransferRecipient(e.target.value)}
                  disabled={transferState.isLoading}
                  aria-label="Select recipient"
                >
                  <option value="">Select recipient</option>
                  {otherUsers.map(user => (
                    <option key={user.id} value={`${user.firstName} ${user.lastName}`}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleTransfer}
                className="w-full"
                disabled={transferState.isLoading}
              >
                {transferState.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Transfer...
                  </>
                ) : (
                  'Send Money'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'topup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Top Up Wallet
              </CardTitle>
              <CardDescription>Add funds to your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertMessage state={topupState} type="error" />
              <AlertMessage state={topupState} type="success" />

              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  disabled={topupState.isLoading}
                />
                <p className="text-sm text-gray-500 mt-1">Minimum: $1.00 | Maximum: $10,000.00</p>
              </div>

              <Button onClick={handleTopup} className="w-full" disabled={topupState.isLoading}>
                {topupState.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Top-up...
                  </>
                ) : (
                  'Add Funds'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
