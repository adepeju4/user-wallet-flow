import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  currentWalletFormatted, 
  transactionsWithFormatted, 
  otherUsers,
  formatCurrency,
  formatDate 
} from '@/utils/dummyData'
import type { TransactionWithFormatted } from '@/types'
import { ArrowUpRight, ArrowDownLeft, Plus, Send } from 'lucide-react'

export default function WalletDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transfer' | 'topup'>('overview')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferRecipient, setTransferRecipient] = useState('')
  const [topupAmount, setTopupAmount] = useState('')

  const getTransactionIcon = (transaction: TransactionWithFormatted) => {
    switch (transaction.type) {
      case 'TRANSFER_IN':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case 'TRANSFER_OUT':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case 'TOPUP':
        return <Plus className="h-4 w-4 text-blue-600" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return 'text-green-600 bg-green-50'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50'
      case 'FAILED':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Creator Co Wallet</h1>
          <p className="text-gray-600 mt-2">Manage your digital wallet with ease</p>
        </div>

        {/* Balance Card */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-gray-900">
              {currentWalletFormatted.balanceFormatted}
            </CardTitle>
            <CardDescription>Current Balance</CardDescription>
          </CardHeader>
        </Card>

        {/* Action Tabs */}
        <div className="flex justify-center space-x-2">
          <Button 
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Button>
          <Button 
            variant={activeTab === 'transfer' ? 'default' : 'outline'}
            onClick={() => setActiveTab('transfer')}
          >
            <Send className="h-4 w-4 mr-2" />
            Transfer
          </Button>
          <Button 
            variant={activeTab === 'topup' ? 'default' : 'outline'}
            onClick={() => setActiveTab('topup')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Top Up
          </Button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest wallet activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactionsWithFormatted.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(transaction)}
                      <div>
                        <p className="font-medium">
                          {transaction.memo || `${transaction.type.replace('_', ' ').toLowerCase()}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </p>
                        {transaction.recipientInfo && (
                          <p className="text-sm text-gray-500">
                            To: {transaction.recipientInfo.name} (@{transaction.recipientInfo.publicHandle})
                          </p>
                        )}
                        {transaction.senderInfo && (
                          <p className="text-sm text-gray-500">
                            From: {transaction.senderInfo.name} (@{transaction.senderInfo.publicHandle})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'TRANSFER_IN' || transaction.type === 'TOPUP' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.type === 'TRANSFER_IN' || transaction.type === 'TOPUP' ? '+' : '-'}
                        {transaction.amountFormatted}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
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
              <CardTitle>Send Money</CardTitle>
              <CardDescription>Transfer money to other users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient</label>
                <Input
                  placeholder="Enter @username or email"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                />
                <div className="mt-2 text-sm text-gray-500">
                  Available users: {otherUsers.map(user => `@${user.publicHandle}`).join(', ')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={!transferAmount || !transferRecipient}>
                <Send className="h-4 w-4 mr-2" />
                Send {transferAmount ? formatCurrency(parseFloat(transferAmount) * 100) : '$0.00'}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'topup' && (
          <Card>
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
              <CardDescription>Top up your wallet balance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[25, 50, 100].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setTopupAmount(amount.toString())}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              <Button className="w-full" disabled={!topupAmount}>
                <Plus className="h-4 w-4 mr-2" />
                Add {topupAmount ? formatCurrency(parseFloat(topupAmount) * 100) : '$0.00'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
