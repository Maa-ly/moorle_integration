'use client';

import React, { useState } from 'react';
import { DisbursementForm } from '../components/DisbursementForm';
import { SMSForm } from '../components/SMSForm';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'funds' | 'sms' | null>(null);

  const rotatingTexts = [
    'Send Funds to Anyone Safely',
    'Transfer Money Securely',
    'Pay Anyone, Anywhere'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col">
      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-xs">
        {/* Header */}
        <header className="mb-4 text-center px-2">
          <h1 className="text-xl font-bold text-white mb-2 w-full">
            <span className="block">Welcome to Moolre  —</span>{' '}
            <span className="rotating-text-container inline-block mt-2">
              {rotatingTexts.map((text, index) => (
                <span key={index} className="rotating-text text-yellow-500 dark:text-yellow-400 font-bold text-sm">
                  {text}
                </span>
              ))}
            </span>
          </h1>
        </header>

        {/* Action Buttons */}
        {!showForm && (
          <div className="flex flex-col gap-4 justify-center mt-20">
            <button
              onClick={() => {
                setFormType('funds');
                setShowForm(true);
              }}
              className="
                bg-white dark:bg-gray-800 
                border-4 border-yellow-500 
                rounded-lg shadow-2xl 
                px-12 py-6 
                font-bold text-xl text-gray-900 dark:text-white
                transition-all duration-300
                hover:scale-105
                animate-pulse-border animate-blink animate-pump
                relative overflow-hidden
              "
            >
              <span className="relative z-10">Send Funds</span>
              <div className="absolute inset-0 bg-yellow-500 opacity-10 animate-pulse"></div>
            </button>
            
            <button
              onClick={() => {
                setFormType('sms');
                setShowForm(true);
              }}
              className="
                bg-white dark:bg-gray-800 
                border-4 border-blue-500 
                rounded-lg shadow-2xl 
                px-12 py-6 
                font-bold text-xl text-gray-900 dark:text-white
                transition-all duration-300
                hover:scale-105
                relative overflow-hidden
              "
            >
              <span className="relative z-10">Send SMS</span>
              <div className="absolute inset-0 bg-blue-500 opacity-10"></div>
            </button>
          </div>
        )}

        {/* Content - Forms */}
        {showForm && (
          <div className="mt-6 animate-fade-in">
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => {
                  setFormType('funds');
                }}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                  ${formType === 'funds' 
                    ? 'bg-yellow-500 text-white shadow-md' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }
                `}
              >
                Send Funds
              </button>
              <button
                onClick={() => {
                  setFormType('sms');
                }}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                  ${formType === 'sms' 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }
                `}
              >
                Send SMS
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormType(null);
                }}
                className="
                  px-4 py-2 rounded-lg font-medium text-sm 
                  bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                  hover:bg-gray-300 dark:hover:bg-gray-600
                  transition-all duration-200
                "
              >
                ✕
              </button>
            </div>
            
            {formType === 'funds' && <DisbursementForm />}
            {formType === 'sms' && <SMSForm />}
          </div>
        )}

        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-400">
        <div className="flex flex-col items-center gap-2">
          <a
            href="https://docs.moolre.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:underline font-medium"
          >
            View Documentation
          </a>
          <p className="text-xs text-gray-500">
            Trusted by Moolre
          </p>
        </div>
      </footer>
    </div>
  );
}
