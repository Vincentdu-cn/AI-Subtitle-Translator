
import React, { useCallback, useState } from 'react';
import { SubtitleFormat } from '../types';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
  onFileLoad: (content: string, fileName:string, format: SubtitleFormat) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad, disabled }) => {
  const [dragging, setDragging] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = ''; // Reset input so same file can be re-uploaded
  }, [onFileLoad]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const fileName = file.name;
      let format = SubtitleFormat.UNKNOWN;
      if (fileName.toLowerCase().endsWith('.srt')) {
        format = SubtitleFormat.SRT;
      } else if (fileName.toLowerCase().endsWith('.ass')) {
        format = SubtitleFormat.ASS;
      }
      onFileLoad(content, fileName, format);
    };
    reader.readAsText(file);
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (disabled) return;

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      processFile(file);
      event.dataTransfer.clearData();
    }
  }, [onFileLoad, disabled]);


  return (
    <div className="w-full">
      <label
        htmlFor="file-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center w-full h-48 px-4 
          border-2 border-dashed rounded-xl cursor-pointer
          transition-colors duration-200 ease-in-out
          ${disabled ? 'bg-gray-700 border-gray-600 cursor-not-allowed' : 
            dragging ? 'bg-purple-700/30 border-purple-500' : 'bg-gray-700/50 border-gray-600 hover:border-purple-500 hover:bg-purple-700/20'}
        `}
      >
        <UploadIcon className={`w-12 h-12 mb-3 ${disabled ? 'text-gray-500' : dragging ? 'text-purple-400' : 'text-gray-400'}`} />
        <p className={`mb-2 text-sm ${disabled ? 'text-gray-500' : dragging ? 'text-purple-300' : 'text-gray-300'}`}>
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className={`text-xs ${disabled ? 'text-gray-600' : dragging ? 'text-purple-400' : 'text-gray-500'}`}>
          SRT or ASS files
        </p>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          className="sr-only"
          accept=".srt,.ass"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
};
