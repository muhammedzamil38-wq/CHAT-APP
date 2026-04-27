import { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { api } from '../lib/api';

export function FileUploadZone() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setProgress(0);

    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      await api.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      toast.success('Upload complete', {
        id: toastId,
        description: `${file.name} securely transmitted.`
      });
    } catch (error) {
      toast.error('Upload failed', {
        id: toastId,
        description: error.response?.data?.message || 'Transmission interrupted.'
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 5 * 1024 * 1024, // 5MB limit
    onDropRejected: () => {
      toast.error('File rejected', { description: 'File size exceeds nominal limit (5MB)' });
    }
  });

  return (
    <Card className="glass overflow-hidden border-dashed border-2 border-border/50 hover:border-primary/50 transition-colors">
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={`p-10 flex flex-col items-center justify-center cursor-pointer min-h-[250px] relative transition-all ${isDragActive ? 'bg-primary/5' : 'bg-transparent'
            }`}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {uploading ? (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center space-y-4 w-full px-8"
              >
                <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">Transmitting Data... {progress}%</p>
                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <UploadCloud size={32} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-medium">Drag & Drop Intel Here</p>
                  <p className="text-sm text-muted-foreground">or click to browse local storage (Max 5MB)</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
