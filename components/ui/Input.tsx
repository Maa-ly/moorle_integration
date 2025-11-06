import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
              {label && (
                <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
              <input
                id={inputId}
                className={`
                  w-full px-3 py-2 rounded-lg border transition-all duration-200 text-sm
          focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800
          ${error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300 dark:border-gray-600'
          }
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          ${className}
        `}
        {...props}
      />
              {error && (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
              {helperText && !error && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
              )}
    </div>
  );
};

