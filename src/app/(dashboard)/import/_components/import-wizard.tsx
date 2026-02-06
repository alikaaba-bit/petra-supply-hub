"use client";

import * as React from "react";
import { useTransition } from "react";
import { UploadDropzone } from "./upload-dropzone";
import { ValidationResults } from "./validation-results";
import { PreviewTable } from "./preview-table";
import { CommitResult } from "./commit-result";
import { parseAndValidateForecast, commitForecastImport } from "@/server/actions/import-forecast";
import { parseAndValidateSales, commitSalesImport } from "@/server/actions/import-sales";
import type { SerializedForecastRow } from "@/server/actions/import-forecast";
import type { SerializedSalesRow } from "@/server/actions/import-sales";
import type { ValidationError } from "@/server/services/validators/forecast-validator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ValidationWarning {
  row: number;
  message: string;
  sheet?: string;
}

type WizardStep = 'upload' | 'validating' | 'results' | 'preview' | 'committing' | 'complete';

interface ImportWizardProps {
  importType: 'forecast' | 'sales';
  onBack: () => void;
}

export function ImportWizard({ importType, onBack }: ImportWizardProps) {
  const [step, setStep] = React.useState<WizardStep>('upload');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  // Validation results
  const [validationData, setValidationData] = React.useState<{
    validRows: SerializedForecastRow[] | SerializedSalesRow[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
    validCount: number;
    format?: string;
    previewData: any[];
  } | null>(null);

  // Import results
  const [importResults, setImportResults] = React.useState<{
    imported: number;
    updated: number;
  } | null>(null);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setStep('validating');

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      try {
        const result = importType === 'forecast'
          ? await parseAndValidateForecast(formData)
          : await parseAndValidateSales(formData);

        if (!result.success) {
          toast.error(result.error || 'Failed to parse file');
          setStep('upload');
          setSelectedFile(null);
          return;
        }

        // Type guard: result.success is true, so validation and previewData exist
        if (!result.validation || !result.previewData) {
          toast.error('Invalid response from server');
          setStep('upload');
          setSelectedFile(null);
          return;
        }

        setValidationData({
          validRows: result.validation.valid,
          errors: result.validation.errors,
          warnings: result.validation.warnings,
          validCount: result.validation.summary.validRows,
          format: 'format' in result ? result.format : undefined,
          previewData: result.previewData,
        });
        setStep('results');
      } catch (error) {
        toast.error('An error occurred while processing the file');
        setStep('upload');
        setSelectedFile(null);
      }
    });
  };

  const handleContinueToPreview = () => {
    setStep('preview');
  };

  const handleConfirmImport = async () => {
    if (!validationData) return;

    setStep('committing');

    startTransition(async () => {
      try {
        const result = importType === 'forecast'
          ? await commitForecastImport(validationData.validRows as SerializedForecastRow[])
          : await commitSalesImport(validationData.validRows as SerializedSalesRow[]);

        if (!result.success) {
          toast.error(result.error || 'Failed to import data');
          setStep('preview');
          return;
        }

        setImportResults({
          imported: result.imported ?? 0,
          updated: (result as any).updated ?? 0,
        });
        setStep('complete');
        toast.success(`Successfully imported ${result.imported ?? 0} records`);
      } catch (error) {
        toast.error('An error occurred during import');
        setStep('preview');
      }
    });
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setValidationData(null);
    setImportResults(null);
  };

  const handleCancel = () => {
    setStep('upload');
    setSelectedFile(null);
    setValidationData(null);
  };

  const currentStepNumber = {
    upload: 1,
    validating: 2,
    results: 2,
    preview: 3,
    committing: 4,
    complete: 4,
  }[step];

  const progressValue = (currentStepNumber / 4) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {importType === 'forecast' ? 'Forecast' : 'Retail Sales'} Import
            </h1>
            <p className="text-muted-foreground">
              Step {currentStepNumber} of 4
            </p>
          </div>
        </div>
      </div>

      <Progress value={progressValue} className="w-full" />

      {step === 'upload' && (
        <div className="space-y-6">
          <UploadDropzone
            onFileSelected={handleFileSelected}
            selectedFile={selectedFile}
            onClear={() => setSelectedFile(null)}
          />
        </div>
      )}

      {step === 'validating' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Validating file...</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      )}

      {step === 'results' && validationData && (
        <ValidationResults
          errors={validationData.errors}
          warnings={validationData.warnings}
          validCount={validationData.validCount}
          format={validationData.format}
          onContinue={handleContinueToPreview}
          onCancel={handleCancel}
        />
      )}

      {step === 'preview' && validationData && (
        <PreviewTable
          data={validationData.previewData}
          totalRows={validationData.validCount}
          importType={importType}
          onConfirm={handleConfirmImport}
          onCancel={handleCancel}
        />
      )}

      {step === 'committing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Importing data...</p>
          <p className="text-sm text-muted-foreground">Please wait while we save your data</p>
        </div>
      )}

      {step === 'complete' && importResults && (
        <CommitResult
          imported={importResults.imported}
          updated={importResults.updated}
          importType={importType}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
