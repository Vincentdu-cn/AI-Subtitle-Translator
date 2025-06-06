
import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  statusText: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, statusText }) => {
  return (
    <div className="w-full space-y-2 mt-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-purple-400">{statusText}</span>
        <span className="text-sm font-medium text-purple-400">{progress}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
