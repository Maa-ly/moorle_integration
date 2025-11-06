// moolre api client
const API_BASE_URL = process.env.NEXT_PUBLIC_MOORLE_API_BASE_URL || 'https://api.moolre.com';
const API_KEY = process.env.NEXT_PUBLIC_MOORLE_PRIVATE_API_KEY;
const USERNAME = process.env.NEXT_PUBLIC_MOORLE_USERNAME;
const YOUR_ACCOUNT_NUMBER = process.env.NEXT_PUBLIC_MOORLE_ACCOUNT_NUMBER;

if (!API_KEY || !USERNAME || !YOUR_ACCOUNT_NUMBER) {
  console.error('Missing required Moolre environment variables. Please check your .env.local file.');
}

// channel codes: 1=MTN, 2=Bank, 6=Vodafone, 7=AirtelTigo
export const CHANNELS = {
  MTN: 1,
  BANK: 2,
  VODAFONE: 6,
  AIRTELTIGO: 7,
} as const;

interface NameValidationRequest {
  accountNumber: string;
  bankCode: string;
  channel: number;
  currency: string;
}

interface NameValidationResponse {
  success: boolean;
  accountName?: string;
  message?: string;
  error?: string;
}

interface TransferRequest {
  accountNumber: string;
  bankCode: string;
  channel: number;
  amount: string;
  currency: string;
  reference?: string;
  description?: string;
  externalRef?: string;
}

interface TransferResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  amount?: string;
  currency?: string;
  error?: string;
  txstatus?: number;
  externalRef?: string;
}

interface TransferStatusResponse {
  success: boolean;
  txstatus?: number; // 1 - Successful, 0 - Pending, 2 - Failed
  transactionId?: string;
  externalRef?: string;
  receiver?: string;
  receivername?: string;
  amount?: string;
  message?: string;
  error?: string;
}

// validate account name
export async function validateAccountName(
  accountNumber: string,
  bankCode: string,
  channel: number = CHANNELS.BANK,
  currency: string = 'GHS'
): Promise<NameValidationResponse> {
  if (!API_KEY || !USERNAME || !YOUR_ACCOUNT_NUMBER) {
    return {
      success: false,
      error: 'API configuration missing. Please check environment variables.',
      message: 'Missing required environment variables',
    };
  }

  try {
    const response = await fetch('/api/moolre/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountNumber,
        bankCode,
        channel,
        currency,
      }),
    });

    const data = await response.json();

    if (data.status === 1 && data.data) {
      return {
        success: true,
        accountName: data.data,
        message: data.message || 'Account name validated successfully',
      };
    } else {
      return {
        success: false,
        error: data.message || 'Validation failed',
        message: data.message || 'Unable to validate account name',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      message: 'Failed to validate account name',
    };
  }
}

// send money
export async function transferFunds(
  transferData: TransferRequest
): Promise<TransferResponse> {
  if (!API_KEY || !USERNAME || !YOUR_ACCOUNT_NUMBER) {
    return {
      success: false,
      error: 'API configuration missing. Please check environment variables.',
      message: 'Missing required environment variables',
    };
  }

  try {
    const response = await fetch('/api/moolre/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountNumber: transferData.accountNumber,
        bankCode: transferData.bankCode,
        channel: transferData.channel,
        amount: transferData.amount,
        currency: transferData.currency,
        reference: transferData.reference,
        description: transferData.description,
        externalRef: transferData.externalRef,
      }),
    });

    const data = await response.json();

    if (data.status === 1 && data.data) {
      return {
        success: true,
        transactionId: data.data.transactionid,
        message: Array.isArray(data.message) ? data.message.join('. ') : data.message,
        amount: transferData.amount,
        currency: transferData.currency,
        txstatus: data.data.txstatus,
        externalRef: data.data.externalref || transferData.externalRef,
      };
    } else {
      return {
        success: false,
        error: Array.isArray(data.message) ? data.message.join('. ') : data.message,
        message: Array.isArray(data.message) ? data.message.join('. ') : data.message,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      message: 'Failed to process transfer',
    };
  }
}

// check transaction status
export async function checkTransferStatus(
  transactionId: string,
  idType: 'transaction' | 'external' = 'transaction'
): Promise<TransferStatusResponse> {
  if (!API_KEY || !USERNAME || !YOUR_ACCOUNT_NUMBER) {
    return {
      success: false,
      error: 'API configuration missing. Please check environment variables.',
      message: 'Missing required environment variables',
    };
  }

  try {
    const response = await fetch('/api/moolre/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId,
        idType,
      }),
    });

    const data = await response.json();

    if (data.status === 1 && data.data) {
      return {
        success: true,
        txstatus: data.data.txstatus,
        transactionId: data.data.transactionid,
        externalRef: data.data.externalref,
        receiver: data.data.receiver || data.data.payee,
        receivername: data.data.receivername,
        amount: data.data.amount || data.data.value,
        message: Array.isArray(data.message) ? data.message.join('. ') : data.message,
      };
    } else {
      return {
        success: false,
        error: Array.isArray(data.message) ? data.message.join('. ') : data.message,
        message: Array.isArray(data.message) ? data.message.join('. ') : data.message,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      message: 'Failed to check transfer status',
    };
  }
}

