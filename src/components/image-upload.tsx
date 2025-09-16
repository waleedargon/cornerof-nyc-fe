'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import { createFileInputHandler, fileToBase64, UploadOptions } from '@/lib/storage';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  variant?: 'avatar' | 'banner' | 'square';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  uploadOptions?: UploadOptions;
  disabled?: boolean;
  placeholder?: string;
}

export function ImageUpload({
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  variant = 'square',
  size = 'md',
  uploadOptions,
  disabled = false,
  placeholder = 'Click to upload image'
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    try {
      const preview = await fileToBase64(file);
      setPreviewUrl(preview);
      onImageSelect(file);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process image',
        variant: 'destructive'
      });
    }
  };

  const handleError = (error: string) => {
    toast({
      title: 'Invalid file',
      description: error,
      variant: 'destructive'
    });
  };

  const fileHandler = createFileInputHandler(handleFileSelect, handleError, uploadOptions);

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onImageRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as React.ChangeEvent<HTMLInputElement>;
      fileHandler(fakeEvent);
    }
  };

  const displayUrl = previewUrl || currentImageUrl;

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const containerClass = `
    relative cursor-pointer transition-all duration-200
    ${sizeClasses[size]}
    ${variant === 'banner' ? 'aspect-[16/9] w-full h-auto' : ''}
    ${variant === 'avatar' ? 'rounded-full' : 'rounded-lg'}
    ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2'}
  `.trim();

  if (variant === 'avatar') {
    return (
      <div className="relative">
        <Avatar 
          className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 ${isDragging ? 'ring-2 ring-primary ring-offset-2' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2'}`}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AvatarImage src={displayUrl} alt="Avatar" />
          <AvatarFallback className="bg-muted">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        {(displayUrl || previewUrl) && onImageRemove && !disabled && (
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={fileHandler}
          className="hidden"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={containerClass}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Upload preview"
              className="w-full h-full object-cover rounded-lg"
            />
            {onImageRemove && !disabled && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center bg-muted/10">
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center px-2">
              {placeholder}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              or drag & drop
            </p>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={fileHandler}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

interface ImageUploadButtonProps {
  onImageSelect: (file: File) => void;
  uploadOptions?: UploadOptions;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ImageUploadButton({
  onImageSelect,
  uploadOptions,
  disabled = false,
  loading = false,
  children
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleError = (error: string) => {
    toast({
      title: 'Invalid file',
      description: error,
      variant: 'destructive'
    });
  };

  const fileHandler = createFileInputHandler(onImageSelect, handleError, uploadOptions);

  const handleClick = () => {
    if (disabled || loading) return;
    fileInputRef.current?.click();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={disabled || loading}
        className="relative"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        {children || 'Upload Image'}
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={fileHandler}
        className="hidden"
        disabled={disabled || loading}
      />
    </>
  );
}
