import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ServerError } from '../error';

interface ChargebeeWebhookEvent {
  id: string;
  event_type: string;
  api_version: string;
  occurred_at: number;
  source: string;
  webhook_status: string;
  content: {
    invoice?: any;
    transaction?: any;
    payment_source?: any;
    customer?: any;
  };
}

/**
 * Essential webhook events for topup functionality include invoice_generated (when topup invoice is created),
 * payment_succeeded (when topup payment is successful), payment_failed (when topup payment fails), and
 * payment_source_added (when user saves a new card). Note that Chargebee uses basic authentication for
 * webhooks, not HMAC signature verification.
 */
export const handleChargebeeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event: ChargebeeWebhookEvent = req.body;
    
    logger.info('Received Chargebee webhook');


    switch (event.event_type) {
      case 'payment_succeeded':
        await handlePaymentSucceeded(event);
        break;
      
      case 'payment_failed':
        await handlePaymentFailed(event);
        break;
      
      case 'payment_source_added':
        await handlePaymentSourceAdded(event);
        break;
      
      default:
        logger.info('Unhandled webhook event type', { eventType: event.event_type });
        break;
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', {
      error: error.message,
      eventType: req.body?.event_type,
    });
    next(new ServerError(`Webhook processing failed: ${error.message}`));
  }
};

/**
 * Handles successful payment events for topup functionality. This process involves finding the invoice by
 * cbInvoiceId, locating the user via invoice.userId, updating invoice status to PAID, finding the pending
 * TOPUP transaction, updating transaction status to SUCCEEDED, adding the amount to wallet balance, and
 * creating a ledger entry for audit trail.
 */
const handlePaymentSucceeded = async (event: ChargebeeWebhookEvent) => {
  const transaction = event.content.transaction;
  if (!transaction || !transaction.invoice_id) return;

  logger.info('Processing payment success', { 
    transactionId: transaction.id,
    invoiceId: transaction.invoice_id 
  });
  
  // TODO: Implement actual database updates
};

/**
 * Handles failed payment events for topup functionality. This process involves finding the invoice by
 * cbInvoiceId, locating the pending TOPUP transaction, updating transaction status to FAILED, and
 * optionally notifying the user about the failed payment.
 */
const handlePaymentFailed = async (event: ChargebeeWebhookEvent) => {
  const transaction = event.content.transaction;
  if (!transaction || !transaction.invoice_id) return;

  logger.info('Processing payment failure', { 
    transactionId: transaction.id,
    invoiceId: transaction.invoice_id 
  });
  
  // TODO: Implement actual database updates
};

/**
 * Handles payment source addition events when users save new payment methods. This process involves
 * finding the user by cbCustomerId, checking if the payment source already exists, creating a new
 * PaymentSource record, and setting it as default if the user has no other payment methods.
 */
const handlePaymentSourceAdded = async (event: ChargebeeWebhookEvent) => {
  const paymentSource = event.content.payment_source;
  if (!paymentSource || !paymentSource.customer_id) return;

  logger.info('Processing payment source addition', { 
    paymentSourceId: paymentSource.id,
    customerId: paymentSource.customer_id 
  });
  
  // TODO: Implement actual database updates
};
