
import React from 'react';
import { TranslateIcon } from './icons/TranslateIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ActionButtonsProps {
  onTranslate: () => void;
  onDownload: () => void;
  isTranslating: boolean;
  canTranslate: boolean;
  canDownload: boolean;
}

const Button: React.FC<{
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}> = ({ onClick, disabled, children, variant = 'primary', className = '' }) => {
  const baseStyle = "px-6 py-3 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center justify-center space-x-2 shadow-md";
  const primaryStyle = `bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white focus:ring-pink-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  const secondaryStyle = `bg-gray-600 hover:bg-gray-500 text-gray-200 focus:ring-gray-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variant === 'primary' ? primaryStyle : secondaryStyle} ${className}`}
    >
      {children}
    </button>
  );
};


export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onTranslate,
  onDownload,
  isTranslating,
  canTranslate,
  canDownload,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
      <Button onClick={onTranslate} disabled={!canTranslate || isTranslating} variant="primary" className="w-full sm:w-auto">
        {isTranslating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Translating...
          </>
        ) : (
          <>
            <TranslateIcon className="w-5 h-5 mr-2" />
            Translate
          </>
        )}
      </Button>
      <Button onClick={onDownload} disabled={!canDownload || isTranslating} variant="secondary" className="w-full sm:w-auto">
        <DownloadIcon className="w-5 h-5 mr-2" />
        Download Translated File
      </Button>
    </div>
  );
};
