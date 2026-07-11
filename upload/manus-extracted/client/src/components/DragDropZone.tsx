import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, File, X } from 'lucide-react';

interface DragDropZoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxSize?: number; // in MB
}

/**
 * DragDropZone Component
 * Interactive drag-and-drop file upload with glassmorphism, progress, and success states
 */
export default function DragDropZone({
  onFileSelect,
  acceptedFormats = ['.png', '.jpg', '.jpeg', '.pdf'],
  maxSize = 50,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      setError(`Invalid file format. Accepted: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return false;
    }

    return true;
  };

  const simulateUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    // Simulate upload progress
    for (let i = 0; i <= 100; i += Math.random() * 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setUploadProgress(Math.min(i, 100));
    }

    // Final progress
    setUploadProgress(100);
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsUploading(false);
    setUploadSuccess(true);
    setSelectedFile(file);
    onFileSelect(file);

    // Reset success state after 3 seconds
    setTimeout(() => {
      setUploadSuccess(false);
      setUploadProgress(0);
    }, 3000);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        simulateUpload(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        simulateUpload(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setUploadProgress(0);
    setUploadSuccess(false);
    setSelectedFile(null);
    setError(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main drag-drop zone */}
      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className="relative cursor-pointer group"
        animate={{
          scale: isDragging ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Glassmorphic background */}
        <div className="absolute inset-0 backdrop-blur-xl border-2 border-dashed rounded-3xl bg-gradient-to-br from-purple-600/10 via-magenta-600/5 to-purple-700/10 transition-all duration-300"
          style={{
            borderColor: isDragging ? 'rgb(168, 85, 247)' : 'rgb(255, 255, 255, 0.2)',
          }}
        />

        {/* Animated glow on drag */}
        <motion.div
          className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 to-magenta-600/30 rounded-3xl opacity-0 blur-2xl -z-10"
          animate={{
            opacity: isDragging ? 0.5 : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Content */}
        <div className="relative p-12 md:p-16 lg:p-20 text-center">
          <AnimatePresence mode="wait">
            {/* Default state */}
            {!isUploading && !uploadSuccess && (
              <motion.div
                key="default"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Icon */}
                <motion.div
                  className="flex justify-center"
                  animate={{ y: isDragging ? -10 : 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-magenta-600/30 rounded-full blur-xl" />
                    <motion.div
                      className="relative p-6 rounded-full bg-gradient-to-br from-purple-600/20 to-magenta-600/10 border border-white/20 backdrop-blur-xl"
                      animate={{
                        scale: isDragging ? 1.1 : 1,
                      }}
                    >
                      <Upload className="w-12 h-12 text-transparent bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Text */}
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-foreground mb-2">
                    Drop your diagram here
                  </h3>
                  <p className="text-gray-400 font-light text-sm md:text-base">
                    or click to browse from your computer
                  </p>
                </div>

                {/* Supported formats */}
                <div className="flex flex-wrap justify-center gap-2 pt-4">
                  {acceptedFormats.map((format) => (
                    <motion.span
                      key={format}
                      className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-gray-300 font-mono"
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                    >
                      {format}
                    </motion.span>
                  ))}
                </div>

                {/* File size info */}
                <p className="text-xs text-gray-500 font-light">
                  Maximum file size: {maxSize}MB
                </p>
              </motion.div>
            )}

            {/* Uploading state */}
            {isUploading && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <motion.div
                  className="relative p-6 rounded-full bg-gradient-to-br from-purple-600/20 to-magenta-600/10 border border-white/20 backdrop-blur-xl w-fit mx-auto"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Upload className="w-12 h-12 text-transparent bg-gradient-to-r from-purple-400 to-magenta-400 bg-clip-text animate-pulse" />
                </motion.div>

                <div>
                  <h3 className="text-2xl font-black text-foreground mb-2">
                    Uploading...
                  </h3>
                  <p className="text-gray-400 font-light text-sm">
                    Processing your diagram
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-3">
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-xl">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-magenta-500 to-purple-600"
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />

                    {/* Shimmer effect */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ['0%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={{ width: '30%' }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-400 font-light">
                    <span>Uploading</span>
                    <span className="font-mono">{Math.round(uploadProgress)}%</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success state */}
            {uploadSuccess && selectedFile && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Success icon with animation */}
                <motion.div
                  className="flex justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: 3 }}
                >
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-green-500/50 to-emerald-500/50 rounded-full blur-xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: 3 }}
                    />
                    <motion.div
                      className="relative p-6 rounded-full bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-white/20 backdrop-blur-xl"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 0.8 }}
                    >
                      <CheckCircle className="w-12 h-12 text-green-400" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* File info */}
                <div>
                  <h3 className="text-2xl font-black text-foreground mb-2">
                    Upload successful!
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-gray-400 font-light text-sm">
                    <File className="w-4 h-4" />
                    <span className="truncate">{selectedFile.name}</span>
                  </div>
                </div>

                {/* File size */}
                <p className="text-xs text-gray-500 font-light">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                </p>

                {/* Checkmarks */}
                <div className="space-y-2 pt-4">
                  {['File validated', 'Ready for processing', 'Click to continue'].map((text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-2 text-sm text-gray-300 font-light"
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-400 flex items-center justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ delay: i * 0.1 + 0.3 }}
                      >
                        <span className="text-white text-xs font-bold">✓</span>
                      </motion.div>
                      {text}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 p-4 rounded-xl bg-red-600/20 border border-red-500/50 backdrop-blur-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-400 hover:text-red-300 mt-2 underline"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload another button (shown after success) */}
      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 flex justify-center gap-4"
          >
            <motion.button
              onClick={resetUpload}
              className="px-6 py-3 rounded-lg font-semibold text-sm bg-white/10 border border-white/20 text-gray-300 hover:text-white hover:bg-white/20 transition-all backdrop-blur-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Upload Another
            </motion.button>
            <motion.button
              className="px-6 py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-purple-600 to-magenta-600 text-white hover:from-purple-500 hover:to-magenta-500 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        accept={acceptedFormats.join(',')}
        className="hidden"
      />
    </div>
  );
}
