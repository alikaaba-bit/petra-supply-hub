"use client";

import * as React from "react";
import { ImportTypeSelector } from "./_components/import-type-selector";
import { ImportWizard } from "./_components/import-wizard";

export default function ImportPage() {
  const [importType, setImportType] = React.useState<'forecast' | 'sales' | null>(null);

  const handleSelectType = (type: 'forecast' | 'sales') => {
    setImportType(type);
  };

  const handleBack = () => {
    setImportType(null);
  };

  if (!importType) {
    return <ImportTypeSelector onSelect={handleSelectType} />;
  }

  return <ImportWizard importType={importType} onBack={handleBack} />;
}
