import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { NotFoundError, UserError, ValidationError } from "../error";
import { topupSchema } from "../validators/financial";
import logger from "../utils/logger";
import prisma from "../utils/prisma";
import { createChargebeeInvoiceForTopup } from "../utils/chargebee";
import { sendResponse } from "../utils/sendResponse";




export const topUpWallet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      return next(new UserError('User authentication required'));
    }

    const topupData = topupSchema.parse(req.body);
    const userId = req.user.id;

    logger.info('Processing wallet topup', { userId, amount: topupData.amount });

    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
          paymentSources: {
            where: { isDefault: true },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.wallet) {
        throw new NotFoundError('User wallet not found');
      }

      if (topupData.paymentMethod === 'saved_card' && !topupData.paymentSourceId) {
        if (user.paymentSources.length === 0) {
          throw new UserError('No saved payment methods found');
        }
        topupData.paymentSourceId = user.paymentSources[0]?.externalId;
      }

      let invoiceResult;
      try {
        const invoiceParams: any = {
          customerId: user.cbCustomerId,
          amountCents: topupData.amount,
          description: topupData.description,
          saveCard: topupData.saveCard,
        };

        if (topupData.paymentSourceId) {
          invoiceParams.paymentSourceId = topupData.paymentSourceId;
        }
        if (topupData.cardToken) {
          invoiceParams.cardToken = topupData.cardToken;
        }

        invoiceResult = await createChargebeeInvoiceForTopup(invoiceParams);
      } catch (chargebeeError: any) {
        logger.error('Chargebee invoice creation failed', {
          userId,
          error: chargebeeError.message,
          amount: topupData.amount,
        });
        throw new UserError(`Payment processing failed: ${chargebeeError.message}`);
      }

      const invoice = invoiceResult.invoice;
      const cbTransaction = invoiceResult.transaction;

      const dbInvoice = await tx.invoice.create({
        data: {
          userId: user.id,
          cbInvoiceId: invoice.id,
          status: invoice.status.toUpperCase() as any,
          recurring: invoice.recurring || false,
          date: new Date(invoice.date * 1000),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
          subTotalCents: BigInt(invoice.sub_total || 0),
          taxCents: BigInt(invoice.tax || 0),
          totalCents: BigInt(invoice.total || 0),
          amountPaidCents: BigInt(invoice.amount_paid || 0),
          amountDueCents: BigInt(invoice.amount_due || 0),
          amountAdjustedCents: BigInt(invoice.amount_adjusted || 0),
          creditsAppliedCents: BigInt(invoice.credits_applied || 0),
          amountToCollectCents: BigInt(invoice.amount_to_collect || 0),
          currency: invoice.currency_code || 'USD',
          exchangeRate: invoice.exchange_rate || 1.0,
          paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
          cbInvoiceUrl: invoice.invoice_url,
          cbInvoicePdfUrl: invoice.invoice_pdf_url,
          firstInvoice: invoice.first_invoice || false,
          termFinalized: invoice.term_finalized !== false,
          priceType: invoice.price_type || 'tax_exclusive',
          cbResourceVersion: BigInt(invoice.resource_version || 0),
        },
      });

      if (topupData.saveCard && cbTransaction?.payment_source_id && !topupData.paymentSourceId) {
        await tx.paymentSource.create({
          data: {
            userId: user.id,
            provider: 'chargebee',
            type: 'card',
            externalId: cbTransaction.payment_source_id,
            displayName: `Card ending in ${cbTransaction.masked_card_number?.slice(-4) || '****'}`,
            isDefault: user.paymentSources.length === 0,
          },
        });
      }

      let transaction = null;
      let newBalance = user.wallet.balanceCents;

      if (invoice.status === 'paid') {
        newBalance = user.wallet.balanceCents + BigInt(topupData.amount);

        transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            walletId: user.wallet.id,
            type: 'TOPUP',
            status: 'SUCCEEDED',
            amountCents: BigInt(topupData.amount),
            memo: topupData.description || 'Wallet topup',
            externalProvider: 'chargebee',
            externalRef: invoice.id,
          },
        });

        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { balanceCents: newBalance },
        });

        await tx.ledgerEntry.create({
          data: {
            txnId: transaction.id,
            walletId: user.wallet.id,
            account: 'user_balance',
            side: 'CREDIT',
            amountCents: BigInt(topupData.amount),
            balanceAfterCents: newBalance,
          },
        });

        logger.info('Wallet topup completed successfully', {
          userId,
          transactionId: transaction.id,
          amount: topupData.amount,
          newBalance: Number(newBalance),
        });
      } else {
        transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            walletId: user.wallet.id,
            type: 'TOPUP',
            status: 'PENDING',
            amountCents: BigInt(topupData.amount),
            memo: topupData.description || 'Wallet topup',
            externalProvider: 'chargebee',
            externalRef: invoice.id,
          },
        });

        logger.info('Wallet topup pending payment', {
          userId,
          transactionId: transaction.id,
          amount: topupData.amount,
          invoiceStatus: invoice.status,
        });
      }

      return {
        transaction: {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          amountCents: Number(transaction.amountCents),
          amountFormatted: (Number(transaction.amountCents) / 100).toFixed(2),
          memo: transaction.memo,
          createdAt: transaction.createdAt,
        },
        invoice: {
          id: dbInvoice.id,
          cbInvoiceId: dbInvoice.cbInvoiceId,
          status: dbInvoice.status,
          totalCents: Number(dbInvoice.totalCents),
          totalFormatted: (Number(dbInvoice.totalCents) / 100).toFixed(2),
          paidAt: dbInvoice.paidAt,
          cbInvoiceUrl: dbInvoice.cbInvoiceUrl,
        },
        wallet: {
          balanceCents: Number(newBalance),
          balanceFormatted: (Number(newBalance) / 100).toFixed(2),
        },
        paymentSaved:
          topupData.saveCard && cbTransaction?.payment_source_id && !topupData.paymentSourceId,
        invoiceStatus: invoice.status,
      };
    });

    return sendResponse({
      res,
      statusCode: 200,
      message:
        result.invoiceStatus === 'paid'
          ? 'Topup completed successfully'
          : 'Topup initiated, payment pending',
      data: result,
    });
  } catch (error: any) {
    logger.error('Wallet topup failed', {
      userId: req.user?.id,
      error: error.message,
      amount: req.body?.amount,
    });

    if (error.name === 'ZodError') {
      return next(
        new ValidationError(
          'Invalid topup data: ' + error.errors.map((e: any) => e.message).join(', ')
        )
      );
    }

    return next(error);
  }
};


export const getPaymentMethods = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return next(new UserError('User authentication required'));
    }

    const paymentSources = await prisma.paymentSource.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
      select: {
        id: true,
        provider: true,
        type: true,
        displayName: true,
        isDefault: true,
      },
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Payment methods retrieved successfully',
      data: { paymentMethods: paymentSources },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve payment methods', {
      userId: req.user?.id,
      error: error.message,
    });
    return next(error);
  }
};