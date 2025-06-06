
import React from 'react';
import { TranslationConfig } from '../types';

interface ConfigurationPanelProps {
  config: TranslationConfig;
  setConfig: React.Dispatch<React.SetStateAction<TranslationConfig>>;
  disabled: boolean;
}

const InputField: React.FC<{
  label: string;
  id: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
}> = ({ label, id, type = 'text', value, onChange, disabled, min, step, placeholder }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
      {label}
    </label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      min={min}
      step={step}
      placeholder={placeholder}
      className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm text-gray-100 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
    />
  </div>
);


export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, setConfig, disabled }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }));
  };

  return (
    <div className="space-y-6 p-6 bg-gray-700/30 rounded-xl shadow">
      <h2 className="text-xl font-semibold text-purple-400 mb-4 border-b border-gray-600 pb-2">AI Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="API Base URL"
          id="apiBaseUrl"
          value={config.apiBaseUrl}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g., https://api.openai.com/v1/chat/completions"
        />
        <InputField
          label="Model Name"
          id="modelName"
          value={config.modelName}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g., gpt-3.5-turbo"
        />
        <InputField
          label="Segment Size (entries per request)"
          id="segmentSize"
          type="number"
          value={config.segmentSize}
          onChange={handleChange}
          disabled={disabled}
          min={1}
        />
        <InputField
          label="Concurrency Limit (parallel requests)"
          id="concurrencyLimit"
          type="number"
          value={config.concurrencyLimit}
          onChange={handleChange}
          disabled={disabled}
          min={1}
        />
      </div>
       <p className="text-xs text-gray-400 mt-4">
        Note: This tool uses a mock translation service for demonstration.
        The API Base URL and Model Name are illustrative and not connected to a live service in this demo.
      </p>
    </div>
  );
};
