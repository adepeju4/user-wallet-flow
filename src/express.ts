import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import logger from './utils/logger';
import prisma from './utils/prisma';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
import { p2pTransferSchema, transactionQuerySchema } from './validators/financial';
import {
  NotFoundErrorHandler,
  ServerErrorHandler,
  ValidationError,
  UserError,
  NotFoundError,
} from './error';
import { sendResponse } from './utils/sendResponse';
import { login, signup } from './controllers/auth';
import { getUserTag, updateUserTag, validateTag } from './controllers/userManagement';
import { getPaymentMethods, topUpWallet } from './controllers/financial';
import { handleChargebeeWebhook } from './controllers/webhook';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);


app.post('/webhook/chargebee', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.body = JSON.parse(req.body.toString());
    handleChargebeeWebhook(req, res, next);
    
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Welcome',
  });
});

app.post('/api/signup', signup);

app.post('/api/login', login);

app.patch('/api/user/tag', authenticateToken, updateUserTag);

app.get('/api/user/tag', authenticateToken, getUserTag);

// to validate if a public tag exists (for transfer validation)
app.get('/api/user/validate-tag', authenticateToken, validateTag);

app.post('/api/topup', authenticateToken, topUpWallet);

app.get('/api/payment-methods', authenticateToken, getPaymentMethods);

// Payment callback endpoints for redirect flows
app.get('/api/payment/success', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { invoice_id, payment_id } = req.query;
    
    if (!invoice_id) {
      return next(new ValidationError('Invoice ID is required'));
    }

    if (!req.user?.id) {
      return next(new UserError('User authentication required'));
    }

    logger.info('Payment success callback', { 
      userId: req.user.id,
      invoiceId: invoice_id,
      paymentId: payment_id 
    });

    // Find the invoice and update status
    const invoice = await prisma.invoice.findFirst({
      where: { 
        cbInvoiceId: invoice_id as string,
        userId: req.user.id 
      },
      include: { user: { include: { wallet: true } } }
    });

    if (!invoice) {
      return next(new NotFoundError('Invoice not found'));
    }

    // Redirect to frontend success page with transaction info
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/payment/success?invoice=${invoice_id}&status=processing`);
    
  } catch (error: any) {
    logger.error('Payment success callback failed', {
      userId: req.user?.id,
      error: error.message,
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/payment/error?message=processing_error`);
  }
});

app.get('/api/payment/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { invoice_id } = req.query;
    
    if (!req.user?.id) {
      return next(new UserError('User authentication required'));
    }

    logger.info('Payment cancelled by user', { 
      userId: req.user.id,
      invoiceId: invoice_id 
    });

    // Update transaction status to cancelled if needed
    if (invoice_id) {
      await prisma.transaction.updateMany({
        where: {
          externalRef: invoice_id as string,
          userId: req.user.id,
          status: 'PENDING'
        },
        data: { status: 'CANCELLED' }
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/payment/cancelled`);
    
  } catch (error: any) {
    logger.error('Payment cancel callback failed', {
      userId: req.user?.id,
      error: error.message,
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/payment/error?message=cancel_error`);
  }
});

app.get('/api/payment/failure', authenticateToken, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { invoice_id, reason } = req.query;
    
    if (!req.user?.id) {
      return next(new UserError('User authentication required'));
    }
    
    logger.info('Payment failed callback', { 
      userId: req.user.id,
      invoiceId: invoice_id,
      reason: reason 
    });

    // Update transaction status to failed
    if (invoice_id) {
      await prisma.transaction.updateMany({
        where: {
          externalRef: invoice_id as string,
          userId: req.user.id,
          status: 'PENDING'
        },
        data: { status: 'FAILED' }
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/payment/failed?reason=${reason || 'unknown'}`);
    
  } catch (error: any) {
    logger.error('Payment failure callback failed', {
      userId: req.user?.id,
      error: error.message,
    });
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/payment/error?message=failure_error`);
  }
});

// MAINLY REQUESTED APIS

app.get(
  '/transactions',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const query = transactionQuerySchema.parse(req.query);

      // Get user's wallet
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!wallet) {
        return next(new UserError('Wallet not found'));
      }

      const whereClause: any = {
        walletId: wallet.id,
      };

      if (query.type) {
        whereClause.type = query.type;
      }

      if (query.status) {
        whereClause.status = query.status;
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: query.limit,
          skip: query.offset,
          select: {
            id: true,
            type: true,
            status: true,
            amountCents: true,
            memo: true,
            createdAt: true,
            externalProvider: true,
            externalRef: true,
          },
        }),
        prisma.transaction.count({ where: whereClause }),
      ]);

      return sendResponse({
        res,
        statusCode: 200,
        message: 'Transactions retrieved successfully',
        data: {
          transactions: transactions.map(tx => ({
            ...tx,
            amountFormatted: (Number(tx.amountCents) / 100).toFixed(2),
          })),
          pagination: {
            total,
            limit: query.limit,
            offset: query.offset,
            hasMore: query.offset + query.limit < total,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to retrieve transactions', {
        userId: req.user?.id,
        error: error.message,
      });

      if (error.name === 'ZodError') {
        return next(
          new ValidationError(
            'Invalid query parameters: ' + error.errors.map((e: any) => e.message).join(', ')
          )
        );
      }

      return next(error);
    }
  }
);

app.get(
  '/wallet',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        select: {
          id: true,
          balanceCents: true,
          currency: true,
          status: true,
        },
      });

      if (!wallet) {
        return next(new NotFoundError('Wallet not found'));
      }

      return sendResponse({
        res,
        statusCode: 200,
        message: 'Wallet retrieved successfully',
        data: {
          wallet: {
            ...wallet,
            balanceFormatted: (Number(wallet.balanceCents) / 100).toFixed(2),
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to retrieve wallet', {
        userId: req.user?.id,
        error: error.message,
      });
      return next(error);
    }
  }
);

// P2P Transfer
app.post(
  '/api/transfer',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const senderId = req.user!.id;
      const transferData = p2pTransferSchema.parse(req.body);

      logger.info('P2P transfer attempt');

      const result = await prisma.$transaction(async tx => {
        const senderWallet = await tx.wallet.findUnique({
          where: { userId: senderId },
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true, publicHandle: true },
            },
          },
        });

        if (!senderWallet) {
          throw new UserError('Sender wallet not found');
        }

        if (senderWallet.status !== 'active') {
          throw new UserError('Sender wallet is not active');
        }

        const recipient = await tx.user.findFirst({
          where: {
            publicHandle: transferData.recipientTag,
          },
          include: {
            wallet: true,
          },
        });

        if (!recipient || !recipient.wallet) {
          throw new UserError('Recipient not found or has no wallet');
        }

        if (recipient.wallet.status !== 'active') {
          throw new UserError('Recipient wallet is not active');
        }

        if (senderId === recipient.id) {
          throw new UserError('Cannot transfer to yourself');
        }

        if (senderWallet.balanceCents < BigInt(transferData.amountCents)) {
          throw new UserError('Insufficient balance');
        }

        const outgoingTx = await tx.transaction.create({
          data: {
            userId: senderId,
            walletId: senderWallet.id,
            type: 'TRANSFER_OUT',
            status: 'SUCCEEDED',
            amountCents: BigInt(transferData.amountCents),
            memo: transferData.remark || `Transfer to ${recipient.firstName} ${recipient.lastName}`,
            externalProvider: 'internal_p2p',
            externalRef: `p2p_${Date.now()}_${senderId.slice(-6)}`,
          },
        });

        const incomingTx = await tx.transaction.create({
          data: {
            userId: recipient.id,
            walletId: recipient.wallet.id,
            type: 'TRANSFER_IN',
            status: 'SUCCEEDED',
            amountCents: BigInt(transferData.amountCents),
            memo:
              transferData.remark ||
              `Transfer from ${senderWallet.user.firstName} ${senderWallet.user.lastName}`,
            externalProvider: 'internal_p2p',
            externalRef: `p2p_${Date.now()}_${recipient.id.slice(-6)}`,
          },
        });

        const senderNewBalance = senderWallet.balanceCents - BigInt(transferData.amountCents);
        const recipientNewBalance =
          recipient.wallet.balanceCents + BigInt(transferData.amountCents);

        await tx.wallet.update({
          where: { id: senderWallet.id },
          data: {
            balanceCents: senderNewBalance,
          },
        });

        await tx.wallet.update({
          where: { id: recipient.wallet.id },
          data: {
            balanceCents: recipientNewBalance,
          },
        });

        await tx.ledgerEntry.createMany({
          data: [
            {
              txnId: outgoingTx.id,
              walletId: senderWallet.id,
              account: 'user_balance',
              side: 'DEBIT',
              amountCents: BigInt(transferData.amountCents),
              balanceAfterCents: senderNewBalance,
            },
            {
              txnId: incomingTx.id,
              walletId: recipient.wallet.id,
              account: 'user_balance',
              side: 'CREDIT',
              amountCents: BigInt(transferData.amountCents),
              balanceAfterCents: recipientNewBalance,
            },
          ],
        });

        return {
          success: true,
          transaction: {
            id: outgoingTx.id,
            type: 'TRANSFER_OUT',
            amountCents: transferData.amountCents,
            amountFormatted: (transferData.amountCents / 100).toFixed(2),
            memo: outgoingTx.memo,
            createdAt: outgoingTx.createdAt,
          },
          recipient: {
            name: `${recipient.firstName} ${recipient.lastName}`,
            publicHandle: recipient.publicHandle,
          },
          balanceAfter: {
            cents: Number(senderNewBalance),
            formatted: (Number(senderNewBalance) / 100).toFixed(2),
          },
        };
      });

      logger.info('P2P transfer completed successfully');

      return sendResponse({
        res,
        statusCode: 200,
        message: 'Transfer completed successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('P2P transfer failed', {
        senderId: req.user?.id,
        error: error.message,
        recipientTag: req.body?.recipientTag,
      });

      if (error.name === 'ZodError') {
        return next(
          new ValidationError(
            'Invalid transfer data: ' + error.errors.map((e: any) => e.message).join(', ')
          )
        );
      }

      return next(error);
    }
  }
);



app.use(ServerErrorHandler);

app.use(NotFoundErrorHandler);

app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}`);
  
  // Test database connection on startup
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error: any) {
    logger.error('❌ Database connection failed', { error: error.message });
  }
});

export default app;
