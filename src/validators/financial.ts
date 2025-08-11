import { z } from 'zod';

export const p2pTransferSchema = z
  .object({
    recipientTag: z.string().min(1, 'Recipient public handle is required'),
    amountCents: z.number().positive('Amount must be positive').int('Amount must be an integer'),
    remark: z.string().optional(),
  })
  .strict();

export const topupSchema = z
  .object({
    amount: z.number().positive('Amount must be positive').int('Amount must be an integer'),
    description: z.string().optional().default('Wallet topup'),
    paymentMethod: z.enum(['card', 'saved_card']).default('card'),
    paymentSourceId: z.string().optional(),
    saveCard: z.boolean().optional().default(false),
    cardToken: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.paymentMethod === 'saved_card') {
        return !!data.paymentSourceId;
      }
      if (data.paymentMethod === 'card') {
        return !!data.cardToken;
      }
      return true;
    },
    {
      message: 'Payment source ID is required for saved cards, card token is required for new cards',
    }
  );

export const transactionQuerySchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional().default(20),
    offset: z.number().int().min(0).optional().default(0),
    type: z.enum(['TOPUP', 'CHARGE', 'REFUND', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT']).optional(),
    status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'REVERSED', 'CANCELLED']).optional(),
  })
  .strict();

export type P2PTransferRequest = z.infer<typeof p2pTransferSchema>;
export type TopupRequest = z.infer<typeof topupSchema>;
export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
