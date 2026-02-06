"use client";

import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export function UploadDropzone({ onFileSelected, selectedFile, onClear }: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedFile) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-500 bg-green-50 p-4 dark:bg-green-950">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-8 w-8 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">{selectedFile.name}</p>
            <p className="text-sm text-green-700 dark:text-green-300">{formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn("mb-4 h-12 w-12", isDragActive ? "text-primary" : "text-muted-foreground")} />
        <p className="mb-2 text-lg font-medium">
          {isDragActive ? "Drop your file here" : "Drag and drop your Excel file"}
        </p>
        <p className="mb-4 text-sm text-muted-foreground">or click to browse</p>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <p>Accepts .xlsx files only</p>
          <p>Maximum file size: 10MB</p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="font-medium text-destructive">File rejected:</p>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="mt-2">
              <p className="text-sm text-destructive">{file.name}</p>
              {errors.map((error) => (
                <p key={error.code} className="text-sm text-destructive/80">
                  {error.code === "file-too-large"
                    ? "File is too large. Maximum size is 10MB."
                    : error.code === "file-invalid-type"
                    ? "Invalid file type. Only .xlsx files are accepted."
                    : error.message}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
