import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  description,
}) => {
  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-3xl 
      shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3),0_10px_25px_-5px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.1)]
      dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_10px_25px_-5px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.05)]
      border border-gray-200 dark:border-gray-700
      p-3 transition-all duration-200 w-full
      transform hover:scale-[1.02] hover:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4),0_15px_30px_-5px_rgba(0,0,0,0.3)]
      ${className}
    `}>
      {(title || description) && (
        <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

