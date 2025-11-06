'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { ResponseDisplay } from './ui/ResponseDisplay';
import { Alert } from './ui/Alert';

interface SMSFormData {
  recipient: string;
  message: string;
  senderId?: string;
}

interface NetworkContact {
  id: string;
  name: string;
  phone: string;
}

export const SMSForm: React.FC = () => {
  const [sendMode, setSendMode] = useState<'phone' | 'network'>('phone');
  const [formData, setFormData] = useState<SMSFormData>({
    recipient: '',
    message: '',
    senderId: '',
  });
  const [networkContacts, setNetworkContacts] = useState<NetworkContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [response, setResponse] = useState<unknown>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const response = await fetch('/api/moolre/network/contacts');
      const data = await response.json();
      if (response.ok) {
        setNetworkContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) {
      setError('Name and phone are required');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newContactPhone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsAddingContact(true);
    setError('');

    try {
      const response = await fetch('/api/moolre/network/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContactName,
          phone: newContactPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add contact');
      }

      await loadContacts();
      setNewContactName('');
      setNewContactPhone('');
      setShowAddContact(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const response = await fetch(`/api/moolre/network/contacts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadContacts();
        setSelectedContactIds(prev => prev.filter(contactId => contactId !== id));
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleInputChange = (field: keyof SMSFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setResponse(null);
  };

  const handleContactSelect = (contactId: string) => {
    setSelectedContactIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.message) {
      setError('Message is required');
      return;
    }

    if (sendMode === 'phone') {
      if (!formData.recipient) {
        setError('Recipient phone number is required');
        return;
      }

      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.recipient.replace(/\s/g, ''))) {
        setError('Please enter a valid phone number');
        return;
      }
    } else {
      if (selectedContactIds.length === 0) {
        setError('Please select at least one contact from your network');
        return;
      }
    }

    setIsSending(true);
    setError('');
    setResponse(null);

    try {
      if (sendMode === 'phone') {
        // single send
        const response = await fetch('/api/moolre/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: formData.recipient,
            message: formData.message,
            senderId: formData.senderId || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to send SMS');
        }

        setResponse(data);
        // clear form after success
        setFormData({
          recipient: '',
          message: '',
          senderId: '',
        });
      } else {
        // bulk send to network contacts
        const selectedContacts = networkContacts.filter(c => selectedContactIds.includes(c.id));
        const messages = selectedContacts.map(contact => ({
          recipient: contact.phone,
          message: formData.message,
        }));

        const response = await fetch('/api/moolre/sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messages,
            senderId: formData.senderId || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || 'Failed to send SMS');
        }

        // format response with contact info
        setResponse({
          success: true,
          total: selectedContacts.length,
          contacts: selectedContacts.map(c => ({ name: c.name, phone: c.phone })),
          ...data,
        });
        // clear form after success
        setFormData(prev => ({
          ...prev,
          message: '',
        }));
        setSelectedContactIds([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setIsSending(false);
    }
  };

  const characterCount = formData.message.length;
  const maxLength = 160;
  const isMessageTooLong = characterCount > maxLength;

  const selectedContacts = networkContacts.filter(c => selectedContactIds.includes(c.id));

  const responseObj = response as any;
  const isSuccess = responseObj?.success === true;
  const showSuccess = response !== null && isSuccess;

  return (
    <>
      {/* Success Message - Centered on Mobile */}
      {showSuccess ? (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xs px-4 md:relative md:top-auto md:left-auto md:translate-x-0 md:translate-y-0 md:z-auto md:mb-4">
          <ResponseDisplay
            response={response}
            isLoading={isSending}
            error={error}
          />
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleSendSMS} className="space-y-5">
          {/* Send Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={sendMode === 'phone' ? 'primary' : 'outline'}
            onClick={() => {
              setSendMode('phone');
              setError('');
              setResponse(null);
            }}
            className="flex-1"
          >
            Send to Phone Number
          </Button>
          <Button
            type="button"
            variant={sendMode === 'network' ? 'primary' : 'outline'}
            onClick={() => {
              setSendMode('network');
              setError('');
              setResponse(null);
            }}
            className="flex-1"
          >
            Send to Network
          </Button>
        </div>

        {sendMode === 'phone' ? (
          <Input
            label="Recipient Phone Number"
            type="tel"
            value={formData.recipient}
            onChange={(e) => handleInputChange('recipient', e.target.value)}
            placeholder="+233XXXXXXXXX"
            required
            helperText="Include country code (e.g., +233 for Ghana)"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Select Network Contacts
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddContact(!showAddContact)}
                className="text-xs py-1 px-2"
              >
                {showAddContact ? 'Cancel' : '+ Add Contact'}
              </Button>
            </div>

            {showAddContact && (
              <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
                <Input
                  label="Contact Name"
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+233XXXXXXXXX"
                  required
                  helperText="Include country code"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddContact}
                  isLoading={isAddingContact}
                  className="w-full"
                >
                  Add Contact
                </Button>
              </div>
            )}

            {isLoadingContacts ? (
              <div className="text-center py-4 text-sm text-gray-500">Loading contacts...</div>
            ) : networkContacts.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 border border-gray-300 dark:border-gray-600 rounded-lg">
                No contacts in your network. Click "Add Contact" to add one.
              </div>
            ) : (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                {networkContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                      selectedContactIds.includes(contact.id) ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                    }`}
                    onClick={() => handleContactSelect(contact.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => handleContactSelect(contact.id)}
                        className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {contact.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContact(contact.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedContacts.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        <Input
          label="Sender ID (Optional)"
          type="text"
          value={formData.senderId}
          onChange={(e) => handleInputChange('senderId', e.target.value)}
          placeholder="Your business name"
          helperText="Leave empty to use default sender ID"
          maxLength={11}
        />

        <Textarea
          label="Message"
          value={formData.message}
          onChange={(e) => handleInputChange('message', e.target.value)}
          placeholder="Enter your message here..."
          required
          maxLength={maxLength}
          helperText={`${characterCount}/${maxLength} characters`}
          className={isMessageTooLong ? 'border-red-500' : ''}
        />

        {isMessageTooLong && (
          <Alert type="error">
            Message exceeds {maxLength} characters. Please shorten your message.
          </Alert>
        )}

        {error && (
          <Alert type="error">{error}</Alert>
        )}

        <Button
          type="submit"
          variant="primary"
          isLoading={isSending}
          disabled={isMessageTooLong || isSending}
          className="w-full md:w-auto"
        >
          {isSending ? 'Sending...' : 'Send SMS'}
        </Button>

        {/* Show error response at bottom if not success */}
        {response !== null && !isSuccess ? (
          <ResponseDisplay
            response={response}
            isLoading={isSending}
            error={error}
          />
        ) : null}
      </form>
    </Card>
    </>
  );
};

