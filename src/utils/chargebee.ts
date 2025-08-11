const chargebee = require('chargebee');
import { ServerError } from '../error';
import logger from './logger';


chargebee.configure({
  site: process.env.CHARGEBEE_SITE ?? '',
  api_key: process.env.CHARGEBEE_API_KEY ?? ''
});

export const createChargebeeInvoiceForTopup = async (params: {
  customerId: string;
  amountCents: number;
  description?: string;
  paymentSourceId?: string;
  cardToken?: string;
  saveCard?: boolean;
}) => {
  try {
    const invoiceParams: any = {
      customer_id: params.customerId,
      currency_code: 'USD',
      auto_collection: 'on',
      charges: [
        {
          amount: params.amountCents,
          description: params.description || 'Wallet topup',
        },
      ],
    };

    if (params.paymentSourceId) {
      invoiceParams.payment_source_id = params.paymentSourceId;
    }

    if (params.cardToken) {
      invoiceParams.card = {
        token_id: params.cardToken,
      };
      if (params.saveCard) {
        invoiceParams.retain_payment_source = true;
        invoiceParams.replace_primary_payment_source = false;
      }
    }

    const result = await chargebee.invoice
      .create_for_charge_items_and_charges(invoiceParams)
      .request();

    logger.info('Chargebee invoice created for topup', {
      customerId: params.customerId,
      invoiceId: result.invoice.id,
      amountCents: params.amountCents,
      status: result.invoice.status,
    });

    return {
      invoice: result.invoice,
      transaction: result.transaction,
    };
  } catch (error: any) {
    logger.error('Failed to create Chargebee invoice for topup', {
      error: error.message,
      customerId: params.customerId,
      amountCents: params.amountCents,
    });
    throw new ServerError(`Chargebee invoice creation failed: ${error.message}`);
  }
};

export const createChargebeeCustomer = async (userDetails: {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}) => {
  try {
    const result = await chargebee.customer.create({
      email: userDetails.email,
      first_name: userDetails.firstName,
      last_name: userDetails.lastName,
      phone: userDetails.phoneNumber,
      auto_collection: 'on'
    });

    logger.info('Chargebee customer created');

    return result.customer;
  } catch (error: any) {
    logger.error('Failed to create Chargebee customer');
    throw new ServerError(`Chargebee customer creation failed: ${error.message}`);
  }
};

export const createChargebeeVirtualBankAccount = async (customerId: string, email: string) => {
  try {
    const result = await chargebee.virtual_bank_account.create({
      customer_id: customerId,
      email: email,
      scheme: 'ach_credit'
    }).request();

    logger.info('Chargebee virtual bank account created', {
      customerId,
      vbaId: result.virtual_bank_account.id,
      accountNumber: result.virtual_bank_account.account_number,
      routingNumber: result.virtual_bank_account.routing_number,
      bankName: result.virtual_bank_account.bank_name
    });

    return result.virtual_bank_account;
  } catch (error: any) {
    logger.error('Failed to create Chargebee virtual bank account', {
      error: error.message,
      customerId,
      email
    });
    throw new ServerError(`Chargebee virtual bank account creation failed: ${error.message}`);
  }
};

export default chargebee;
