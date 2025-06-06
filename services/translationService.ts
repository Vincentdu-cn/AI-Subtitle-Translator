
import { SrtEntry, AssEntry } from '../types';
import { entryIsSrtEntry, entryIsAssEntry } from './subtitleUtils';

// This is a MOCK translation service.
// In a real application, this would make API calls to the configured service.

const MOCK_DELAY_MS = 300; // Simulate network latency

const simulateTranslation = (text: string): string => {
  if (!text || text.trim() === "") return ""; // Handle empty or whitespace-only strings
  return `[CN] ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`; // Simple mock
};

export const mockTranslateBatch = async (
  segment: (SrtEntry | AssEntry)[],
  _apiBaseUrl: string, // Parameters for a real API call
  _modelName: string
): Promise<(SrtEntry | AssEntry)[]> => {
  
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS + Math.random() * 200));

  return segment.map(entry => {
    if (entryIsSrtEntry(entry)) {
      return {
        ...entry,
        text: simulateTranslation(entry.text),
      };
    } else if (entryIsAssEntry(entry)) {
      const textKey = entry.dialogueParts.formatKeys.find(k => k.toLowerCase() === 'text');
      if (textKey && entry.dialogueParts.values.hasOwnProperty(textKey)) {
        const originalText = entry.dialogueParts.values[textKey];
        const translatedText = simulateTranslation(originalText);
        return {
          ...entry,
          dialogueParts: {
            ...entry.dialogueParts,
            values: {
              ...entry.dialogueParts.values,
              [textKey]: translatedText,
            },
          },
        };
      }
    }
    return entry; // Return original if not translatable or unknown type, or if textKey is not found
  });
};