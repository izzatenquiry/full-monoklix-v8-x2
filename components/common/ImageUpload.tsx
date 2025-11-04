import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, TrashIcon } from '../Icons';

interface ImageUploadProps {
  id: string;
  onImageUpload: (base64: string, mimeType: string, file: File) => void;
  onRemove?: () => void;
  title?: string;
  description?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  id,
  onImageUpload, 
  onRemove,
  title = "Upload Image",
  description
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64String = reader.result.split(',')[1];
          setPreview(reader.result);
          onImageUpload(base64String, file.type, file);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const onDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  }, [handleFileChange]);
  
  const onDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPreview(null);
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="relative">
      <label 
        htmlFor={id}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 h-40 ${!preview ? 'cursor-pointer' : ''} ${isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-neutral-300 dark:border-neutral-700 hover:border-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
          className="hidden"
          id={id}
          disabled={!!preview}
        />
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto max-h-full rounded-md object-contain" />
        ) : (
          <div className="flex flex-col items-center text-neutral-500 dark:text-neutral-400">
            <UploadIcon className="w-6 h-6 mb-2" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{title}</p>
          </div>
        )}
      </label>
      {preview && (
        <button 
          onClick={handleRemove}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
          aria-label="Remove image"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
      {fileName && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-center">File: {fileName}</p>}
      {description && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-center">{description}</p>}
    </div>
  );
};

export default ImageUpload;