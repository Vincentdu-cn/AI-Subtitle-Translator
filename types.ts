export enum SubtitleFormat {
  SRT = 'srt',
  ASS = 'ass',
  UNKNOWN = 'unknown',
}

// Common structure for a single subtitle entry's text content.
// For SRT, this is the entire text block.
// For ASS, this is the 'Text' field from a Dialogue line.
export interface TextBlock {
  text: string;
}

export interface SrtEntry extends TextBlock {
  id: string; // Sequence number as string
  startTime: string; // e.g., "00:00:20,000"
  endTime: string;   // e.g., "00:00:24,400"
  // rawText: string; // The original text block, potentially multi-line
}

export interface AssDialogueParts {
  formatKeys: string[]; // Order of keys from the Format: line (e.g., "Layer", "Start", "End", "Text")
  values: Record<string, string>; // Key-value pairs for a specific Dialogue line
                                  // The 'Text' key will hold the text to be translated/is translated
}

export interface AssEntry {
  originalLineIndex: number; // To help reconstruct in order if needed
  dialogueParts: AssDialogueParts; // Parsed parts of the dialogue line
  // textToTranslate: string; // Extracted from dialogueParts.values based on 'Text' key
  // translatedText?: string; // Store translated text here, then update dialogueParts.values
}

// Represents the fully parsed subtitle file content
export interface SubtitlesData {
  fileName: string;
  format: SubtitleFormat;
  entries: (SrtEntry | AssEntry)[];
  // For ASS, store header, styles, and events format line to reconstruct the file
  assPreamble?: string; // Content before [Events] like [Script Info], [V4+ Styles]
  assEventsFormatLine?: string; // The "Format: ..." line itself for [Events]
}

export interface TranslationConfig {
  apiBaseUrl: string;
  modelName: string;
  apiKey?: string; // API Key is optional
  segmentSize: number;
  concurrencyLimit: number;
}