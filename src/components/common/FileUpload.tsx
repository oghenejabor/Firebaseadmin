import React, { useState, useRef } from 'react';
import { Upload, X, Image, File, Loader, Check, AlertCircle } from 'lucide-react';
import { uploadFileToS3, UploadProgress, formatFileSize, isImageFile } from '../../utils/s3Upload';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  folder?: string;
  placeholder?: string;
  currentUrl?: string;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  acceptedTypes = "image/*,video/*",
  maxSize = 10,
  folder = 'uploads',
  placeholder = "Click to upload or drag and drop",
  currentUrl,
  className = ""
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      const error = `File size must be less than ${maxSize}MB`;
      setUploadError(error);
      toast.error(error);
      return;
    }

    // Validate file type
    const acceptedTypesArray = acceptedTypes.split(',').map(type => type.trim());
    const isValidType = acceptedTypesArray.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/');
      if (type === 'video/*') return file.type.startsWith('video/');
      return file.type === type;
    });

    if (!isValidType) {
      const error = 'Invalid file type';
      setUploadError(error);
      toast.error(error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    // Create preview for images
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    try {
      const url = await uploadFileToS3(file, folder, (progress) => {
        setUploadProgress(progress);
      });

      setPreviewUrl(url);
      onUploadComplete(url);
      toast.success('File uploaded successfully!');
    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      setUploadError(errorMessage);
      toast.error(errorMessage);
      setPreviewUrl(null);
      
      // If it's a configuration error, suggest checking S3 settings
      if (errorMessage.includes('configuration') || errorMessage.includes('S3')) {
        toast.error('Please check your S3 settings in the admin panel', { duration: 5000 });
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const clearFile = () => {
    setPreviewUrl(null);
    setUploadError(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
          ${uploadError ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader className="w-8 h-8 mx-auto animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Uploading to S3...</p>
              {uploadProgress && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadProgress.percentage}% ({formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)})
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : uploadError ? (
          <div className="space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-900">Upload Failed</p>
              <p className="text-xs text-red-700">{uploadError}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadError(null);
                }}
                className="text-xs text-red-600 hover:text-red-800 mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{placeholder}</p>
              <p className="text-xs text-gray-500">
                Max size: {maxSize}MB • Supported: {acceptedTypes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {previewUrl && !uploadError && (
        <div className="relative">
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                {isImageFile({ type: previewUrl.includes('image') ? 'image/jpeg' : 'application/octet-stream' } as File) ? (
                  <Image className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <File className="w-5 h-5 text-blue-600 mr-2" />
                )}
                <span className="text-sm font-medium text-gray-900">File uploaded to S3</span>
                <Check className="w-4 h-4 text-green-600 ml-2" />
              </div>
              <button
                onClick={clearFile}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Image Preview */}
            {(previewUrl.includes('image') || previewUrl.startsWith('data:image')) ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-32 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                <File className="w-8 h-8 text-gray-400" />
              </div>
            )}

            {/* File URL */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 break-all">{previewUrl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};