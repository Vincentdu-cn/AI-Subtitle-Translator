
import { SubtitleFormat, SubtitlesData, SrtEntry, AssEntry, AssDialogueParts } from '../types';

// SRT Parsing
const parseSrt = (content: string): SrtEntry[] => {
  const entries: SrtEntry[] = [];
  const blocks = content.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) continue; // Expect at least ID, time, text

    const id = lines[0].trim();
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) continue;

    const startTime = timeMatch[1];
    const endTime = timeMatch[2];
    const text = lines.slice(2).join('\n').trim();

    entries.push({ id, startTime, endTime, text });
  }
  return entries;
};

// ASS Parsing
const parseAss = (content: string): Omit<SubtitlesData, 'fileName' | 'format'> => {
  const entries: AssEntry[] = [];
  let assPreamble = "";
  let assEventsFormatLine: string | undefined;
  
  const lines = content.split(/\r?\n/);
  let inEventsSection = false;
  let formatKeys: string[] = [];
  let textKeyIndex = -1;

  let preambleLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.toLowerCase().startsWith('[events]')) {
      inEventsSection = true;
      preambleLines.push(line); // Include [Events] tag in preamble
      assPreamble = preambleLines.join('\n');
      continue;
    }

    if (!inEventsSection) {
      preambleLines.push(lines[i]); // Preserve original line ending
      continue;
    }

    // Inside [Events]
    if (line.toLowerCase().startsWith('format:')) {
      assEventsFormatLine = lines[i]; // Preserve original line
      formatKeys = line.substring('format:'.length).split(',').map(k => k.trim());
      textKeyIndex = formatKeys.findIndex(k => k.toLowerCase() === 'text');
      if (textKeyIndex === -1) {
        console.warn("ASS Format line does not contain 'Text' field. Translation might not work correctly.");
      }
      continue;
    }

    if (line.toLowerCase().startsWith('dialogue:') && formatKeys.length > 0 && textKeyIndex !== -1) {
      const dialogueValues = line.substring('dialogue:'.length).split(',', formatKeys.length);
      const values: Record<string, string> = {};
      formatKeys.forEach((key, idx) => {
        values[key] = dialogueValues[idx]?.trim() || "";
      });
      
      entries.push({
        originalLineIndex: i,
        dialogueParts: {
          formatKeys: [...formatKeys], // Store a copy of format keys for this entry
          values: values,
        },
      });
    } else if (line.toLowerCase().startsWith('dialogue:') && textKeyIndex === -1) {
        // If no 'Text' field, still store the line to reconstruct it later
         entries.push({
            originalLineIndex: i,
            dialogueParts: {
                formatKeys: ['Unknown'], // Placeholder
                values: { Unknown: line.substring('dialogue:'.length).trim() }
            }
         });
    }
  }
  if (!assPreamble && lines.length > 0 && !inEventsSection) { // If no [Events] tag but content exists
    assPreamble = lines.join('\n');
  }


  return { entries, assPreamble, assEventsFormatLine };
};


export const parseSubtitleFile = async (content: string, fileName: string, format: SubtitleFormat): Promise<SubtitlesData> => {
  switch (format) {
    case SubtitleFormat.SRT:
      return {
        fileName,
        format,
        entries: parseSrt(content),
      };
    case SubtitleFormat.ASS:
      const assParsed = parseAss(content);
      return {
        fileName,
        format,
        ...assParsed,
      };
    default:
      throw new Error('Unsupported file format for parsing');
  }
};

// SRT Formatting
const formatSrt = (entries: SrtEntry[]): string => {
  return entries.map(entry => 
    `${entry.id}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}`
  ).join('\n\n') + '\n'; // Ensure trailing newline for some players
};

// ASS Formatting
const formatAss = (data: SubtitlesData): string => {
  let output = data.assPreamble || "";
  if (data.assEventsFormatLine) {
    if (!output.endsWith('\n')) output += '\n'; // Ensure newline before format line if preamble exists
    output += data.assEventsFormatLine;
  }

  data.entries.forEach(entry => {
    if (entryIsAssEntry(entry)) {
      const { dialogueParts } = entry;
      const textKey = dialogueParts.formatKeys.find(k => k.toLowerCase() === 'text');
      
      let dialogueValuesString: string;
      if (textKey && dialogueParts.values[textKey] !== undefined) {
         // Standard case: reconstruct from parts
         dialogueValuesString = dialogueParts.formatKeys.map(key => dialogueParts.values[key] || "").join(',');
      } else if (dialogueParts.formatKeys.length === 1 && dialogueParts.formatKeys[0] === 'Unknown') {
        // Fallback for lines that couldn't be fully parsed but were preserved
        dialogueValuesString = dialogueParts.values['Unknown'] || "";
      } else {
        // Fallback for malformed entries: try to join values if any
        dialogueValuesString = Object.values(dialogueParts.values).join(',');
      }
      if (!output.endsWith('\n')) output += '\n';
      output += `Dialogue: ${dialogueValuesString}`;
    }
  });
  if (!output.endsWith('\n')) output += '\n';
  return output;
};

export const formatSubtitles = (data: SubtitlesData): string => {
  switch (data.format) {
    case SubtitleFormat.SRT:
      // Filter to ensure all entries are SrtEntry before passing to formatSrt
      const srtEntries = data.entries.filter(entryIsSrtEntry) as SrtEntry[];
      return formatSrt(srtEntries);
    case SubtitleFormat.ASS:
      return formatAss(data); // formatAss handles AssEntry type internally
    default:
      throw new Error('Unsupported file format for formatting');
  }
};


// Type guards
export function entryIsSrtEntry(entry: SrtEntry | AssEntry): entry is SrtEntry {
  return (entry as SrtEntry).startTime !== undefined && (entry as SrtEntry).id !== undefined;
}

export function entryIsAssEntry(entry: SrtEntry | AssEntry): entry is AssEntry {
  return (entry as AssEntry).dialogueParts !== undefined;
}
