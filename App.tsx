
import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ActionButtons } from './components/ActionButtons';
import { ProgressBar } from './components/ProgressBar';
import { SubtitleFormat, SubtitlesData, SrtEntry, AssEntry, TranslationConfig } from './types';
import { parseSubtitleFile, formatSubtitles } from './services/subtitleUtils';
import { translateBatchCustomAI, translateTextWithCustomAI } from './services/translationService';
import { DEFAULT_SEGMENT_SIZE, DEFAULT_CONCURRENCY_LIMIT, DEFAULT_API_BASE_URL, DEFAULT_MODEL_NAME, DEFAULT_API_KEY } from './constants';

const App: React.FC = () => {
  const [subtitlesData, setSubtitlesData] = useState<SubtitlesData | null>(null);
  const [translatedEntries, setTranslatedEntries] = useState<(SrtEntry | AssEntry)[]>([]);
  const [config, setConfig] = useState<TranslationConfig>({
    apiBaseUrl: DEFAULT_API_BASE_URL,
    modelName: DEFAULT_MODEL_NAME,
    apiKey: DEFAULT_API_KEY,
    segmentSize: DEFAULT_SEGMENT_SIZE,
    concurrencyLimit: DEFAULT_CONCURRENCY_LIMIT,
  });
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationProgress, setTranslationProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Upload a subtitle file to begin.');
  const [error, setError] = useState<string | null>(null);

  // AI Provider Testing State
  const [isTestingProvider, setIsTestingProvider] = useState<boolean>(false);
  const [isProviderTested, setIsProviderTested] = useState<boolean>(false);
  const [testProviderError, setTestProviderError] = useState<string | null>(null);
  const [criticalAiErrorOccurred, setCriticalAiErrorOccurred] = useState<boolean>(false);

  useEffect(() => {
    // Reset provider test status if AI config changes
    setIsProviderTested(false);
    setTestProviderError(null);
  }, [config.apiBaseUrl, config.modelName, config.apiKey]);

  const handleFileLoad = useCallback(async (content: string, fileName: string, format: SubtitleFormat) => {
    setError(null);
    setTranslatedEntries([]);
    setTranslationProgress(0);
    setCriticalAiErrorOccurred(false); // Reset critical error on new file
    if (format === SubtitleFormat.UNKNOWN) {
      setError('Unsupported file type. Please upload .srt or .ass files.');
      setStatusMessage('Unsupported file. Please try again.');
      setSubtitlesData(null);
      return;
    }
    try {
      const parsedData = await parseSubtitleFile(content, fileName, format);
      setSubtitlesData(parsedData);
      setStatusMessage(`${fileName} loaded. Configure AI provider or test existing settings.`);
    } catch (err) {
      console.error("Error parsing subtitle file:", err);
      setError(`Error parsing file: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('Error parsing file. Please check format.');
      setSubtitlesData(null);
    }
  }, []);

  const handleTestProvider = useCallback(async () => {
    if (!config.apiBaseUrl || !config.modelName) {
      setTestProviderError('API Base URL and Model Name must be configured before testing.');
      setIsProviderTested(false);
      return;
    }
    setIsTestingProvider(true);
    setTestProviderError(null);
    setIsProviderTested(false);
    setStatusMessage('Testing AI Provider...');

    try {
      const testText = "你好"; // "Hello" in Chinese for testing
      await translateTextWithCustomAI(testText, config.apiBaseUrl, config.modelName, config.apiKey);
      setIsProviderTested(true);
      setStatusMessage('AI Provider test successful!');
      setTestProviderError(null);
    } catch (err) {
      console.error("AI Provider test failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      // Provide a more user-friendly message for common issues like network or auth.
      let displayError = `Test failed: ${errorMessage}`;
      if (errorMessage.toLowerCase().includes('failed to fetch') || errorMessage.toLowerCase().includes('networkerror')) {
        displayError = "Test failed: Could not connect to the API Base URL. Check the URL and network connection.";
      } else if (errorMessage.toLowerCase().includes('401') || errorMessage.toLowerCase().includes('unauthorized')) {
        displayError = "Test failed: Unauthorized. Check if the API Base URL and API Key are correct.";
      } else if (errorMessage.toLowerCase().includes('timeout')) {
        displayError = `Test failed: API call timed out. The server might be slow or unreachable. (${errorMessage})`;
      }
      setTestProviderError(displayError);
      setIsProviderTested(false);
      setStatusMessage('AI Provider test failed. Check configuration.');
    } finally {
      setIsTestingProvider(false);
    }
  }, [config.apiBaseUrl, config.modelName, config.apiKey]);


  const handleTranslate = useCallback(async () => {
    if (!subtitlesData || subtitlesData.entries.length === 0) {
      setError('No subtitles loaded or file is empty.');
      return;
    }
    if (!isProviderTested) {
      setError('AI Provider has not been tested successfully. Please test the configuration first.');
      setStatusMessage('AI Provider not tested. Test before translating.');
      return;
    }
    if (!config.apiBaseUrl || !config.modelName) {
        setError('API Base URL and Model Name must be configured.');
        setStatusMessage('Configuration incomplete. Please set API details.');
        return;
    }

    setIsTranslating(true);
    setTranslationProgress(0);
    setTranslatedEntries([]);
    setError(null); 
    setCriticalAiErrorOccurred(false); // Reset critical error flag for new translation
    setStatusMessage('Initializing translation...');

    const originalEntries = subtitlesData.entries;
    const segments: (SrtEntry | AssEntry)[][] = [];
    for (let i = 0; i < originalEntries.length; i += config.segmentSize) {
      segments.push(originalEntries.slice(i, i + config.segmentSize));
    }

    const totalSegments = segments.length;
    const resultsBySegment: ((SrtEntry | AssEntry)[] | null)[] = Array(totalSegments).fill(null);
    
    let currentGlobalCompleted = 0;

    const processSingleSegment = async (segment: (SrtEntry | AssEntry)[], segmentIndex: number) => {
      if (criticalAiErrorOccurred) return; // Stop processing if a critical AI error has already happened

      try {
        console.log(`Translating segment ${segmentIndex + 1}/${totalSegments} using ${config.modelName} at ${config.apiBaseUrl}...`);
        const translatedSegment = await translateBatchCustomAI(segment, config); // config includes apiKey
        resultsBySegment[segmentIndex] = translatedSegment;
      } catch (err) {
        console.error(`Error translating segment ${segmentIndex + 1}:`, err);
        resultsBySegment[segmentIndex] = segment; // Keep original segment data on error
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(prevError => {
          const newError = `Segment ${segmentIndex + 1} failed: ${errorMessage}`;
          return prevError ? `${prevError}\n${newError}` : newError;
        });
        setCriticalAiErrorOccurred(true); // Set flag to stop further processing by other workers
      }
    };

    const workerPool = async () => {
      const queue = Array.from({ length: totalSegments }, (_, i) => i); 
      const activeWorkers: Promise<void>[] = [];

      const launchWorker = async (segmentIndex: number) => {
        await processSingleSegment(segments[segmentIndex], segmentIndex);
      };
      
      while (queue.length > 0 || activeWorkers.length > 0) {
        if (criticalAiErrorOccurred && queue.length > 0) {
            console.log("Critical AI error detected, clearing remaining segment queue.");
            queue.length = 0; // Stop adding new segments to active workers
        }

        while (activeWorkers.length < config.concurrencyLimit && queue.length > 0) {
          const segmentIndexToProcess = queue.shift()!;
          const workerPromise = launchWorker(segmentIndexToProcess)
            .then(() => {
                currentGlobalCompleted++;
                if (!criticalAiErrorOccurred) { // Only update progress if not critically failed
                    setTranslationProgress(Math.round((currentGlobalCompleted / totalSegments) * 100));
                    setStatusMessage(`Translating... ${currentGlobalCompleted}/${totalSegments} segments processed.`);
                }
            })
            .catch((e) => { // This catch is for launchWorker's promise, processSingleSegment handles its own errors
                currentGlobalCompleted++; // Still count as processed for progress even if error occurred within
                 if (!criticalAiErrorOccurred) {
                    setTranslationProgress(Math.round((currentGlobalCompleted / totalSegments) * 100));
                    setStatusMessage(`Translating... ${currentGlobalCompleted}/${totalSegments} segments processed (segment error).`);
                 }
            })
            .finally(() => {
              const index = activeWorkers.indexOf(workerPromise);
              if (index !== -1) activeWorkers.splice(index, 1);
            });
          activeWorkers.push(workerPromise);
        }

        if (activeWorkers.length > 0) {
          try {
            await Promise.race(activeWorkers.filter(p => p)); // Filter out any potential undefined promises if logic changes
          } catch (raceError) {
            // Promise.race rejects on first rejection, but individual errors are handled.
            // This block might be less critical if individual promises handle their errors.
            console.warn("Promise.race encountered an issue (expected if a worker promise rejected):", raceError);
          }
        }
        if (queue.length === 0 && activeWorkers.length === 0) {
            break; // Exit main while loop once all work is done or queue cleared due to error
        }
      }
      await Promise.allSettled(activeWorkers); 
    };

    try {
      setStatusMessage('Translation in progress...');
      await workerPool();
      
      const finalTranslatedEntries = resultsBySegment.flat().filter(Boolean) as (SrtEntry | AssEntry)[];
      setTranslatedEntries(finalTranslatedEntries);

      if (criticalAiErrorOccurred) {
        setStatusMessage(`Translation stopped due to an AI service error. ${currentGlobalCompleted}/${totalSegments} segments attempted.`);
        // 'error' state will contain specific segment errors.
      } else if (error) { // Non-critical errors, all segments attempted
        setStatusMessage(`Translation completed with some errors. ${currentGlobalCompleted}/${totalSegments} segments processed.`);
      } else if (currentGlobalCompleted === totalSegments && totalSegments > 0) {
        setStatusMessage('Translation complete! Ready for download.');
      } else if (totalSegments === 0) {
        setStatusMessage('No entries to translate.');
      } else { // Partially complete without critical errors (should not happen if no errors and all processed)
         setStatusMessage(`Translation partially complete (${currentGlobalCompleted}/${totalSegments}). Ready for download.`);
      }

    } catch (criticalProcessError) { // Catch errors from workerPool setup or other unexpected issues
      console.error("Critical error during translation process:", criticalProcessError);
      setError(`A critical error occurred: ${criticalProcessError instanceof Error ? criticalProcessError.message : String(criticalProcessError)}`);
      setStatusMessage('Translation process failed critically.');
      setCriticalAiErrorOccurred(true);
    } finally {
      setIsTranslating(false);
      // Update progress to 100 if all segments were processed, even if some had recoverable errors (but no critical stop)
      if (!criticalAiErrorOccurred && currentGlobalCompleted === totalSegments && totalSegments > 0) {
        setTranslationProgress(100);
      } else if (criticalAiErrorOccurred) {
        // Keep progress as is or reflect what was completed.
        setTranslationProgress(Math.round((currentGlobalCompleted / totalSegments) * 100));
      }
    }
  }, [subtitlesData, config, isProviderTested, error]); // Added error to deps for status update


  const handleDownload = useCallback(() => {
    if (!subtitlesData || translatedEntries.length === 0) {
      setError('No translated data to download, or translation was not fully successful.');
      return;
    }
    try {
      const updatedSubtitlesData: SubtitlesData = { ...subtitlesData, entries: translatedEntries };
      const formattedContent = formatSubtitles(updatedSubtitlesData);
      
      const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const originalNameParts = subtitlesData.fileName.split('.');
      const extension = originalNameParts.pop();
      const baseName = originalNameParts.join('.');
      a.download = `${baseName}_translated_zh.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('Translated file downloaded.');
    } catch (err) {
      console.error("Error formatting/downloading subtitles:", err);
      setError(`Error creating download: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('Error creating download file.');
    }
  }, [subtitlesData, translatedEntries]);

  // Clear general error when config changes, as it might be related to old settings
  useEffect(() => {
    setError(null);
  }, [config.apiBaseUrl, config.modelName, config.apiKey, config.segmentSize, config.concurrencyLimit]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-8 selection:bg-purple-500 selection:text-white">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          AI Subtitle Translator
        </h1>
        <p className="mt-2 text-lg text-gray-400">Translate SRT/ASS files. Configure & test your AI provider.</p>
      </header>

      <main className="w-full max-w-4xl bg-gray-800 shadow-2xl rounded-xl p-6 sm:p-8 space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
            <strong className="font-bold">Error(s): </strong>
            <span className="block sm:inline whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <FileUpload onFileLoad={handleFileLoad} disabled={isTranslating || isTestingProvider} />
        
        {subtitlesData && (
          <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
            <p className="text-green-400 font-semibold">File: {subtitlesData.fileName}</p>
            <p className="text-gray-300">Format: {subtitlesData.format.toUpperCase()}, Entries: {subtitlesData.entries.length}</p>
          </div>
        )}

        <ConfigurationPanel
          config={config}
          setConfig={setConfig}
          disabled={isTranslating || isTestingProvider}
          onTestProvider={handleTestProvider}
          isTestingProvider={isTestingProvider}
          isProviderTested={isProviderTested}
          testProviderError={testProviderError}
        />
        
        <ActionButtons
          onTranslate={handleTranslate}
          onDownload={handleDownload}
          isTranslating={isTranslating}
          canTranslate={!!subtitlesData && subtitlesData.entries.length > 0 && !isTranslating && isProviderTested && !criticalAiErrorOccurred}
          canDownload={translatedEntries.length > 0 && !isTranslating}
        />
        
        {(isTranslating || (translationProgress > 0 && translationProgress < 100) || isTestingProvider ) && (
           <ProgressBar progress={isTestingProvider ? 0 : translationProgress} statusText={statusMessage} />
        )}

        { !isTranslating && !isTestingProvider && (translationProgress === 0 || translationProgress === 100 || criticalAiErrorOccurred) && (
            <div className={`mt-4 p-3 rounded-lg text-center ${
                criticalAiErrorOccurred ? 'bg-red-500/30 text-red-300'
                : translationProgress === 100 && !error && subtitlesData && translatedEntries.length > 0 ? 'bg-green-500/20 text-green-300' 
                : translationProgress === 100 && error ? 'bg-yellow-500/20 text-yellow-300' 
                : 'bg-gray-700/30 text-gray-400'}`}>
                <span>{statusMessage}</span>
            </div>
        )}

      </main>
      <footer className="mt-12 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Subtitle Translator. Configure and test your AI provider.</p>
      </footer>
    </div>
  );
};

export default App;