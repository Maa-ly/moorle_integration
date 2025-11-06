import React from 'react';

interface ResponseDisplayProps {
  response?: unknown;
  isLoading?: boolean;
  error?: string;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  response,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Error Response</h3>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap break-words">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!response) {
    return null;
  }

  // check if it's a success
  const responseObj = response as any;
  // status can be string or number
  const statusValue = typeof responseObj?.status === 'string' 
    ? parseInt(responseObj.status) 
    : responseObj?.status;
  const isSuccess = responseObj?.success === true || statusValue === 1;

  if (isSuccess) {
    // show nice success message
    const total = responseObj?.total;
    const contacts = responseObj?.contacts;
    
    return (
      <div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-green-800 dark:text-green-200">
                SMS Sent Successfully!
              </div>
              {total && total > 1 ? (
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Message sent to {total} contact{total !== 1 ? 's' : ''}
                </div>
              ) : (
                <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Your message has been delivered
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // fallback: show raw response
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">API Response</h3>
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {JSON.stringify(response, null, 2)}
        </pre>
      </div>
    </div>
  );
};


