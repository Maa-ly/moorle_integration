'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { ResponseDisplay } from './ui/ResponseDisplay';
import { Alert } from './ui/Alert';
import { validateAccountName, transferFunds, checkTransferStatus, CHANNELS } from '../lib/moolre-api';

interface DisbursementFormData {
  recipientNumber: string; // Mobile money number or bank account number
  accountName: string;
  bankCode: string;
  channel: number; // Destination channel: Bank or Mobile Money
  amount: string;
  currency: string;
  reference: string;
  description: string;
  recipientPhone: string;
  senderPhone: string;
}

interface ValidationResponse {
  isValid: boolean;
  accountName?: string;
  message?: string;
}

export const DisbursementForm: React.FC = () => {
  const [formData, setFormData] = useState<DisbursementFormData>({
    recipientNumber: '',
    accountName: '',
    bankCode: '',
    channel: 0, // Start with no selection
    amount: '',
    currency: 'GHS',
    reference: '',
    description: '',
    recipientPhone: '',
    senderPhone: '',
  });

  const [validationResponse, setValidationResponse] = useState<ValidationResponse | null>(null);
  const [disbursementResponse, setDisbursementResponse] = useState<unknown>(null);
  const [statusResponse, setStatusResponse] = useState<unknown>(null);
  const [recipientSmsResponse, setRecipientSmsResponse] = useState<unknown>(null);
  const [senderSmsResponse, setSenderSmsResponse] = useState<unknown>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [lastTransactionId, setLastTransactionId] = useState<string>('');
  const [lastExternalRef, setLastExternalRef] = useState<string>('');
  const [nameMatches, setNameMatches] = useState<boolean>(false);
  const [validatedName, setValidatedName] = useState<string>('');
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (field: keyof DisbursementFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccessMessage('');
    setDisbursementResponse(null);
    
    // Reset validation state when relevant fields change
    if (field === 'recipientNumber' || field === 'bankCode' || field === 'accountName') {
      setValidationResponse(null);
      setNameMatches(false);
      setValidatedName('');
    }
  };

  // auto-validate when all fields are filled
  useEffect(() => {
    // only for bank transfers
    if (formData.channel !== CHANNELS.BANK) {
      return;
    }

    // need all three fields
    if (!formData.recipientNumber || !formData.bankCode || !formData.accountName) {
      return;
    }

    // clear any pending validation
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // wait 500ms after they stop typing
    validationTimeoutRef.current = setTimeout(async () => {
      setIsValidating(true);
      setError('');
      setValidationResponse(null);
      setNameMatches(false);

      try {
        const response = await validateAccountName(
          formData.recipientNumber,
          formData.bankCode,
          formData.channel,
          formData.currency
        );

        if (response.success && response.accountName) {
          setValidatedName(response.accountName);
          
          // compare names (ignore case and whitespace)
          const enteredName = formData.accountName.trim().toLowerCase();
          const apiName = response.accountName.trim().toLowerCase();
          const matches = enteredName === apiName;

          setNameMatches(matches);
          setValidationResponse({
            isValid: true,
            accountName: response.accountName,
            message: matches 
              ? 'Account name matches!' 
              : `Account name mismatch. API returned: ${response.accountName}`,
          });

          if (!matches) {
            setError(`Name mismatch. Expected: ${response.accountName}`);
          }
        } else {
          setValidationResponse({
            isValid: false,
            message: response.error || response.message || 'Validation failed',
          });
          setNameMatches(false);
        }
      } catch (err) {
        setValidationResponse({
          isValid: false,
          message: 'Validation failed',
        });
        setNameMatches(false);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    // cleanup
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [formData.recipientNumber, formData.bankCode, formData.accountName, formData.channel, formData.currency]);

  const handleValidateName = async () => {
    // Only validate when sending to bank
    if (formData.channel !== CHANNELS.BANK) {
      setError('Name validation is only available when sending to bank accounts');
      return;
    }

    if (!formData.recipientNumber) {
      setError('Account number is required for validation');
      return;
    }

    if (!formData.bankCode) {
      setError('Bank code is required for bank transfers');
      return;
    }

    setIsValidating(true);
    setError('');
    setValidationResponse(null);

    try {
      const response = await validateAccountName(
        formData.recipientNumber,
        formData.bankCode,
        formData.channel,
        formData.currency
      );
      
      if (response.success && response.accountName) {
        setValidationResponse({
          isValid: true,
          accountName: response.accountName,
          message: response.message || 'Account name validated successfully',
        });
        // Auto-fill account name from validation
        setFormData(prev => ({ ...prev, accountName: response.accountName || '' }));
      } else {
        setValidationResponse({
          isValid: false,
          message: response.error || response.message || 'Validation failed',
        });
        setError(response.error || response.message || 'Unable to validate account name');
      }
      
      setIsValidating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setValidationResponse({
        isValid: false,
        message: 'Validation failed',
      });
      setIsValidating(false);
    }
  };

  const sendFailureSMS = async (transactionId: string, amount: string, currency: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    
    // use recipient phone if provided, otherwise use recipient number for mobile money
    const recipientPhone = formData.recipientPhone || (formData.channel !== CHANNELS.BANK ? formData.recipientNumber : '');
    
    if (!recipientPhone || !phoneRegex.test(recipientPhone.replace(/\s/g, ''))) {
      return; // no valid phone number
    }

    try {
      const failureMessage = `A transfer attempt of ${currency} ${amount}${formData.reference ? ` (Ref: ${formData.reference})` : ''} was made to your account but failed due to insufficient balance. Transaction ID: ${transactionId}`;
      
      const response = await fetch('/api/moolre/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: recipientPhone,
          message: failureMessage,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setRecipientSmsResponse({
          success: true,
          messageId: data.messageId || 'SMS' + Date.now(),
          message: 'Failure notification SMS sent to recipient',
          recipient: recipientPhone,
          timestamp: new Date().toISOString(),
          ...data,
        });
      } else {
        setRecipientSmsResponse({
          success: false,
          error: data.error || data.message || 'Failed to send failure notification SMS',
          recipient: recipientPhone,
        });
      }
    } catch (err) {
        // sms failure shouldn't block error handling
      setRecipientSmsResponse({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send failure notification SMS',
        recipient: recipientPhone,
      });
    }
  };

  const sendConfirmationSMS = async (transactionId: string, amount: string, currency: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    setIsSendingSMS(true);
    
    let smsCount = 0;
    let completedCount = 0;
    const checkComplete = () => {
      completedCount++;
      if (completedCount >= smsCount) {
        setIsSendingSMS(false);
      }
    };

    // send sms to recipient
    if (formData.recipientPhone && phoneRegex.test(formData.recipientPhone.replace(/\s/g, ''))) {
      smsCount++;
      try {
        const recipientMessage = `You have received ${currency} ${amount}${formData.reference ? `. Ref: ${formData.reference}` : ''}. Transaction ID: ${transactionId}`;
        
        const response = await fetch('/api/moolre/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: formData.recipientPhone,
            message: recipientMessage,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setRecipientSmsResponse({
            success: true,
            messageId: data.messageId || 'SMS' + Date.now(),
            message: 'Confirmation SMS sent to recipient',
            recipient: formData.recipientPhone,
            timestamp: new Date().toISOString(),
            ...data,
          });
        } else {
          setRecipientSmsResponse({
            success: false,
            error: data.error || data.message || 'Failed to send SMS',
            recipient: formData.recipientPhone,
          });
        }
        checkComplete();
      } catch (err) {
        // SMS failure shouldn't block the disbursement success
        setRecipientSmsResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to send SMS',
          recipient: formData.recipientPhone,
        });
        checkComplete();
      }
    }

    // send sms to sender
    if (formData.senderPhone && phoneRegex.test(formData.senderPhone.replace(/\s/g, ''))) {
      smsCount++;
      try {
        const senderMessage = `Your transfer of ${currency} ${amount} to ${formData.accountName} has been successfully processed. Transaction ID: ${transactionId}.${formData.reference ? ` Ref: ${formData.reference}` : ''}`;
        
        const response = await fetch('/api/moolre/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: formData.senderPhone,
            message: senderMessage,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setSenderSmsResponse({
            success: true,
            messageId: data.messageId || 'SMS' + Date.now() + 1,
            message: 'Confirmation SMS sent to sender',
            recipient: formData.senderPhone,
            timestamp: new Date().toISOString(),
            ...data,
          });
        } else {
          setSenderSmsResponse({
            success: false,
            error: data.error || data.message || 'Failed to send SMS',
            recipient: formData.senderPhone,
          });
        }
        checkComplete();
      } catch (err) {
        // SMS failure shouldn't block the disbursement success
        setSenderSmsResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to send SMS',
          recipient: formData.senderPhone,
        });
        checkComplete();
      }
    }

    // reset loading if no sms to send
    if (smsCount === 0) {
      setIsSendingSMS(false);
    }
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.channel || formData.channel === 0) {
      setError('Please select a payment method');
      return;
    }
    
    if (!formData.recipientNumber || !formData.amount) {
      setError('Please fill in all required fields');
      return;
    }

    // bank transfers need extra validation
    if (formData.channel === CHANNELS.BANK) {
      if (!formData.accountName || !formData.bankCode) {
        setError('Account name and bank code are required when sending to bank accounts');
        return;
      }
      
      // warn if name doesn't match
      if (!nameMatches && formData.accountName) {
        const shouldProceed = window.confirm(
          'Account name does not match the validated name. It is recommended to verify the account name before transferring. Do you want to proceed anyway?'
        );
        if (!shouldProceed) {
          return;
        }
      } else if (!validationResponse && formData.accountName) {
        const shouldProceed = window.confirm(
          'Account name validation is in progress or failed. It is recommended to verify the account name before transferring. Do you want to proceed anyway?'
        );
        if (!shouldProceed) {
          return;
        }
      }
    }

    setIsDisbursing(true);
    setError('');
    setSuccessMessage('');
    setDisbursementResponse(null);
    setRecipientSmsResponse(null);
    setSenderSmsResponse(null);

    try {
      const response = await transferFunds({
        accountNumber: formData.recipientNumber,
        bankCode: formData.bankCode,
        channel: formData.channel,
        amount: formData.amount,
        currency: formData.currency,
        reference: formData.reference,
        description: formData.description,
        externalRef: formData.reference || `TXN-${Date.now()}`,
      });
      
      if (response.success && response.transactionId) {
        setLastTransactionId(response.transactionId);
        setLastExternalRef(response.externalRef || formData.reference || `TXN-${Date.now()}`);
        
        const message = response.message || 'Transfer completed successfully';
        setSuccessMessage(message);
        setError('');
        
        setDisbursementResponse({
          success: true,
          transactionId: response.transactionId,
          message: message,
          amount: response.amount || formData.amount,
          currency: response.currency || formData.currency,
          txstatus: response.txstatus,
          externalRef: response.externalRef,
        });
        
        // handle different statuses
        if (response.txstatus === 1) {
          // success! send confirmation sms
          if (formData.recipientPhone || formData.senderPhone) {
            sendConfirmationSMS(response.transactionId, formData.amount, formData.currency);
          }
        } else if (response.txstatus === 0) {
          // status 0 = pending or failed (usually insufficient balance for mobile money)
          if (formData.channel !== CHANNELS.BANK) {
            sendFailureSMS(response.transactionId, formData.amount, formData.currency);
          } else {
            // banks take longer, check again in a bit
            setTimeout(() => {
              handleCheckStatus(response.transactionId, response.externalRef || formData.reference);
            }, 3000);
          }
        } else if (response.txstatus === 2) {
          // failed, send failure sms
          sendFailureSMS(response.transactionId, formData.amount, formData.currency);
        }
      } else {
        const errorMsg = response.error || response.message || 'Transfer failed';
        setError(errorMsg);
        setSuccessMessage('');
        setDisbursementResponse({
          success: false,
          error: errorMsg,
        });
      }
      
      setIsDisbursing(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMsg);
      setSuccessMessage('');
      setIsDisbursing(false);
    }
  };

  const handleCheckStatus = async (transactionId?: string, externalRef?: string) => {
    const idToCheck = transactionId || lastTransactionId || externalRef || lastExternalRef;
    
    if (!idToCheck) {
      setError('No transaction ID or reference available to check status');
      return;
    }

    setIsCheckingStatus(true);
    setError('');
    setStatusResponse(null);

    try {
      // prefer transaction id, fallback to external ref
      const useTransactionId = transactionId || lastTransactionId;
      const response = await checkTransferStatus(
        useTransactionId || idToCheck,
        useTransactionId ? 'transaction' : 'external'
      );

      if (response.success) {
        setStatusResponse({
          txstatus: response.txstatus,
          transactionId: response.transactionId,
          externalRef: response.externalRef,
          receiver: response.receiver,
          receivername: response.receivername,
          amount: response.amount,
          message: response.message,
          statusText: response.txstatus === 1 ? 'Successful' : response.txstatus === 0 ? 'Pending' : 'Failed',
        });

        // handle status updates
        if (response.txstatus === 0) {
          // still pending, check again (banks take time)
          if (formData.channel === CHANNELS.BANK) {
            setTimeout(() => {
              handleCheckStatus(transactionId, externalRef);
            }, 5000);
          } else {
            // mobile money status 0 usually means failed
            sendFailureSMS(response.transactionId || idToCheck, formData.amount, formData.currency);
          }
        } else if (response.txstatus === 1) {
          // success! send confirmation
          if (formData.recipientPhone || formData.senderPhone) {
            sendConfirmationSMS(response.transactionId || idToCheck, formData.amount, formData.currency);
          }
        } else if (response.txstatus === 2) {
          // failed, notify recipient
          sendFailureSMS(response.transactionId || idToCheck, formData.amount, formData.currency);
        }
      } else {
        setError(response.error || response.message || 'Failed to check status');
        setStatusResponse({
          error: response.error || response.message,
        });
      }

      setIsCheckingStatus(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
      setIsCheckingStatus(false);
    }
  };

  const getStatusBadge = (txstatus: number | undefined) => {
    if (txstatus === undefined) return null;
    
    const statusMap: Record<number, { text: string; color: string }> = {
      1: { text: 'Successful', color: 'bg-green-100 text-green-800 border-green-300' },
      0: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      2: { text: 'Failed', color: 'bg-red-100 text-red-800 border-red-300' },
    };

    const status = statusMap[txstatus] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-300' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
        {status.text}
      </span>
    );
  };

  return (
    <Card>
      {/* Top Alert Messages */}
      {(error || successMessage) && (
        <div className="mb-3">
          {error && (
            <Alert type="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert type="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          )}
        </div>
      )}

      <form onSubmit={handleDisburse} className="space-y-2.5">
        <Select
          label="Payment Method"
          value={formData.channel}
          onChange={(e) => handleInputChange('channel', parseInt(e.target.value))}
          required
          options={[
            { value: 0, label: '(payment method)' },
            { value: CHANNELS.BANK, label: 'Bank Account' },
            { value: CHANNELS.MTN, label: 'MTN Mobile Money' },
            { value: CHANNELS.VODAFONE, label: 'Vodafone Cash' },
            { value: CHANNELS.AIRTELTIGO, label: 'AirtelTigo Money' },
          ]}
        />

        {formData.channel !== 0 && (
          <>
            <Input
              label={formData.channel === CHANNELS.BANK ? "Recipient Account Number" : "Recipient Mobile Money Number"}
              type="text"
              value={formData.recipientNumber}
              onChange={(e) => handleInputChange('recipientNumber', e.target.value)}
              placeholder={formData.channel === CHANNELS.BANK ? "Enter account number" : "Enter mobile money number (e.g., 0246798993)"}
              required
              helperText={formData.channel === CHANNELS.BANK ? "Bank account number of recipient" : "Mobile money number of recipient"}
            />

            {formData.channel === CHANNELS.BANK && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Bank Code"
                type="text"
                value={formData.bankCode}
                onChange={(e) => handleInputChange('bankCode', e.target.value)}
                placeholder="Enter bank code"
                required
                helperText="e.g., GCB, ADB, UBA"
              />

              <div className="relative">
                <Input
                  label="Account Name"
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  placeholder="Enter account name"
                  required
                  helperText={
                    isValidating 
                      ? 'Validating...' 
                      : nameMatches 
                        ? 'Name verified ✓' 
                        : validatedName 
                          ? `API returned: ${validatedName}` 
                          : 'Enter name to auto-validate'
                  }
                  className={nameMatches ? 'border-green-500' : validatedName && !nameMatches ? 'border-red-500' : ''}
                />
                {nameMatches && (
                  <div className="absolute right-3 top-9 text-green-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {isValidating && (
                  <div className="absolute right-3 top-9 text-gray-400">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </>
            )}

            {validationResponse && !nameMatches && validationResponse.message && (
              <Alert type={validationResponse.isValid ? 'success' : 'error'}>
                {validationResponse.message}
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                min="0"
              />
              
              <Input
                label="Currency"
                type="text"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                placeholder="GHS"
                required
                helperText="Default: GHS"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="Reference"
                type="text"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Enter transaction reference"
                helperText="Unique reference"
              />

              <Input
                label="Description"
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter transaction description"
              />
            </div>
          </>
        )}


        <Button
          type="submit"
          variant="primary"
          isLoading={isDisbursing}
          className="w-full"
          disabled={isDisbursing}
        >
          {isDisbursing ? 'Processing...' : 'Disburse Funds'}
        </Button>

        {disbursementResponse !== null && (disbursementResponse as any)?.transactionId && (
          <div className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Transfer Status
                </h3>
                {getStatusBadge((disbursementResponse as any)?.txstatus)}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCheckStatus((disbursementResponse as any)?.transactionId, (disbursementResponse as any)?.externalRef)}
                isLoading={isCheckingStatus}
                disabled={!lastTransactionId && !lastExternalRef}
              >
                Check Status
              </Button>
            </div>

            {statusResponse !== null && (
              <div className="mt-3">
                <ResponseDisplay
                  response={statusResponse}
                  isLoading={isCheckingStatus}
                />
              </div>
            )}

            {/* Auto-check status if pending */}
            {(disbursementResponse as any)?.txstatus === 0 && !statusResponse && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Transfer is pending. Checking status automatically...
              </p>
            )}
          </div>
        )}

      </form>
    </Card>
  );
};

