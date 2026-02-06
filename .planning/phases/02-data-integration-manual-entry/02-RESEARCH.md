# Phase 2: Data Integration & Manual Entry - Research

**Researched:** 2026-02-06
**Domain:** Excel file parsing, data import validation, file upload in Next.js
**Confidence:** HIGH

## Summary

Phase 2 requires implementing Excel file upload and parsing for two distinct forecast formats (RTL FORECAST_MASTER and HOP product-centric), manual data entry forms, and retail sales data import. The research identifies the standard stack and patterns for implementing secure, validated file uploads in Next.js 16 App Router with server-side parsing, Zod validation, and batch database operations.

The critical challenge is handling Excel files securely while providing non-technical users with clear validation feedback before committing data. Research shows 88-90% of spreadsheets contain errors, making robust validation essential. The recommended approach uses ExcelJS for parsing, Next.js Server Actions for file handling, Zod for validation, and a multi-step wizard pattern for preview and confirmation.

**Primary recommendation:** Use ExcelJS for server-side parsing with Next.js Server Actions, implement Zod schema validation for each Excel format, and use a multi-step wizard UI (upload → validate → preview → commit) to ensure data quality before database insertion.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| exceljs | ^4.4.0 | Excel parsing & manipulation | Active maintenance, streaming support, TypeScript types, memory-efficient for large files |
| zod | ^4.3.6 | Schema validation | Already installed, perfect for validating parsed Excel data row-by-row |
| react-hook-form | ^7.53.0+ | Form state management | De facto standard for forms in React, integrates with Zod via @hookform/resolvers |
| @hookform/resolvers | ^3.9.0+ | Zod integration for RHF | Official resolver for connecting Zod schemas to React Hook Form |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dropzone | ^14.2.0+ | Drag-drop file upload | Community standard for file upload UX, integrates with shadcn/ui |
| zod-xlsx | ^1.x | Zod schemas for XLSX | Optional - provides pre-built XLSX validation patterns, batch processing |
| read-excel-file | ^5.8.0+ | Alternative parser | Simpler API if only reading (not writing) Excel, has built-in schema validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ExcelJS | xlsx (SheetJS) | SheetJS supports more formats (.xls, .csv) but lacks streaming, has security concerns (CVE-2023-30533), less TypeScript support |
| ExcelJS | read-excel-file | Simpler API, good for read-only, but no write capability if future phases need Excel export |
| Server Actions | tRPC mutations | tRPC v11 doesn't natively support FormData/multipart - would need base64 encoding or presigned URLs |

**Installation:**
```bash
npm install exceljs react-hook-form @hookform/resolvers react-dropzone
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── server/
│   ├── api/
│   │   └── routers/
│   │       └── import.ts           # tRPC router for imports (orchestration)
│   ├── services/
│   │   ├── parsers/
│   │   │   ├── rtl-forecast.ts     # RTL FORECAST_MASTER parser
│   │   │   ├── hop-forecast.ts     # HOP product-centric parser
│   │   │   └── retail-sales.ts     # Retail sales parser
│   │   └── validators/
│   │       ├── forecast-validator.ts   # Zod schemas for forecast data
│   │       └── sales-validator.ts      # Zod schemas for sales data
│   └── actions/
│       └── file-upload.ts          # Server Actions for file upload
└── app/
    └── (dashboard)/
        └── import/
            ├── page.tsx            # Import landing page
            ├── _components/
            │   ├── upload-dropzone.tsx     # File upload component
            │   ├── import-wizard.tsx       # Multi-step wizard container
            │   ├── validation-results.tsx  # Show errors/warnings
            │   └── preview-table.tsx       # Data preview before commit
            └── manual-entry/
                ├── purchase-order/page.tsx  # Manual PO entry form
                └── retail-order/page.tsx    # Manual retail order form
```

### Pattern 1: Server-Side Parsing with Server Actions
**What:** Parse Excel files on the server using Next.js Server Actions, not client-side
**When to use:** Always for security - prevents malicious files, validates sizes, keeps parsing logic server-only

**Example:**
```typescript
// src/server/actions/file-upload.ts
'use server'

import ExcelJS from 'exceljs'
import { z } from 'zod'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
]

export async function uploadAndParseExcel(formData: FormData) {
  const file = formData.get('file') as File

  // Validate file before parsing
  if (!file) throw new Error('No file provided')
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large (max 10MB)')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid file type')

  // Parse with ExcelJS
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  // Detect format and route to appropriate parser
  const format = detectFormat(workbook)
  const parser = getParser(format)

  return parser.parse(workbook)
}
```

### Pattern 2: Format Detection and Dynamic Parser Selection
**What:** Detect which Excel format is being uploaded and route to the appropriate parser
**When to use:** When handling multiple Excel formats (RTL vs HOP vs retail sales)

**Example:**
```typescript
// src/server/services/parsers/format-detector.ts
import type { Workbook } from 'exceljs'

export type ExcelFormat = 'RTL_FORECAST' | 'HOP_FORECAST' | 'RETAIL_SALES'

export function detectFormat(workbook: Workbook): ExcelFormat {
  const firstSheet = workbook.worksheets[0]
  const headerRow = firstSheet.getRow(1)

  // Parse to matrix first (security best practice)
  const headers = headerRow.values as string[]

  // RTL FORECAST_MASTER: Retailer names in rows, SKUs in columns
  if (headers.some(h => h?.includes('Retailer')) &&
      headers.some(h => h?.match(/^[A-Z]{2,}-\d+$/))) {
    return 'RTL_FORECAST'
  }

  // HOP product-centric: Product in first column, retailers across columns
  if (headers[1]?.toLowerCase() === 'product' &&
      headers.slice(2).some(h => h?.includes('Store'))) {
    return 'HOP_FORECAST'
  }

  // Retail sales: Contains columns like SKU, Units Sold, Revenue
  if (headers.some(h => h?.toLowerCase().includes('sku')) &&
      headers.some(h => h?.toLowerCase().includes('sold'))) {
    return 'RETAIL_SALES'
  }

  throw new Error('Unknown Excel format - cannot detect RTL, HOP, or retail sales structure')
}
```

### Pattern 3: Row-by-Row Validation with Zod
**What:** Validate each parsed row against a Zod schema, collecting errors without stopping
**When to use:** Always - provides granular error reporting to users

**Example:**
```typescript
// src/server/services/validators/forecast-validator.ts
import { z } from 'zod'
import { db } from '@/server/db'
import { skus, retailers } from '@/server/db/schema'

const forecastRowSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  retailer: z.string().min(1, 'Retailer is required'),
  month: z.coerce.date(),
  forecastedUnits: z.number().int().min(0, 'Units must be non-negative'),
  rowNumber: z.number() // Track row for error reporting
})

export type ForecastRow = z.infer<typeof forecastRowSchema>
export type ValidationResult = {
  valid: ForecastRow[]
  errors: Array<{ row: number; field: string; message: string }>
  warnings: Array<{ row: number; message: string }>
}

export async function validateForecastRows(rows: unknown[]): Promise<ValidationResult> {
  const result: ValidationResult = { valid: [], errors: [], warnings: [] }

  // Validate against existing master data
  const existingSKUs = new Set(
    (await db.select({ sku: skus.sku }).from(skus)).map(s => s.sku)
  )
  const existingRetailers = new Set(
    (await db.select({ name: retailers.name }).from(retailers)).map(r => r.name)
  )

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2 // Excel is 1-indexed, header is row 1

    // Schema validation
    const parsed = forecastRowSchema.safeParse({ ...row, rowNumber })
    if (!parsed.success) {
      parsed.error.errors.forEach(err => {
        result.errors.push({
          row: rowNumber,
          field: err.path.join('.'),
          message: err.message
        })
      })
      continue
    }

    // Business logic validation
    const data = parsed.data
    if (!existingSKUs.has(data.sku)) {
      result.errors.push({
        row: rowNumber,
        field: 'sku',
        message: `SKU "${data.sku}" not found in master data`
      })
      continue
    }

    if (!existingRetailers.has(data.retailer)) {
      result.warnings.push({
        row: rowNumber,
        message: `Retailer "${data.retailer}" not found - will be created`
      })
    }

    result.valid.push(data)
  }

  return result
}
```

### Pattern 4: Multi-Step Wizard UI
**What:** Upload → Validate → Preview → Commit workflow with clear state management
**When to use:** Always for imports - users need to see what will be imported before committing

**Example:**
```typescript
// src/app/(dashboard)/import/_components/import-wizard.tsx
'use client'

import { useState } from 'react'
import { UploadDropzone } from './upload-dropzone'
import { ValidationResults } from './validation-results'
import { PreviewTable } from './preview-table'
import { Button } from '@/components/ui/button'

type WizardStep = 'upload' | 'validate' | 'preview' | 'commit' | 'complete'

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState(null)
  const [previewData, setPreviewData] = useState([])

  return (
    <div className="space-y-6">
      {/* Stepper indicator */}
      <div className="flex items-center justify-between">
        <Step active={step === 'upload'} completed={['validate', 'preview', 'commit', 'complete'].includes(step)}>
          1. Upload
        </Step>
        <Step active={step === 'validate'} completed={['preview', 'commit', 'complete'].includes(step)}>
          2. Validate
        </Step>
        <Step active={step === 'preview'} completed={['commit', 'complete'].includes(step)}>
          3. Preview
        </Step>
        <Step active={step === 'commit'} completed={step === 'complete'}>
          4. Import
        </Step>
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <UploadDropzone
          onFileSelected={(f) => {
            setFile(f)
            setStep('validate')
          }}
        />
      )}

      {step === 'validate' && (
        <ValidationResults
          result={validationResult}
          onContinue={() => setStep('preview')}
          onCancel={() => setStep('upload')}
        />
      )}

      {step === 'preview' && (
        <PreviewTable
          data={previewData}
          onConfirm={() => setStep('commit')}
          onCancel={() => setStep('upload')}
        />
      )}
    </div>
  )
}
```

### Pattern 5: Batch Upsert with Conflict Handling
**What:** Insert multiple rows in a single query with upsert logic for existing records
**When to use:** For importing forecast data where month/SKU/retailer combinations might already exist

**Example:**
```typescript
// src/server/services/import-service.ts
import { db } from '@/server/db'
import { forecasts } from '@/server/db/schema'
import type { ForecastRow } from './validators/forecast-validator'

export async function importForecasts(rows: ForecastRow[], userId: string) {
  // Transform validated rows to database format
  const records = rows.map(row => ({
    skuId: row.skuId, // Resolved from SKU string during validation
    retailerId: row.retailerId, // Resolved from retailer name
    month: row.month,
    forecastedUnits: row.forecastedUnits,
    source: 'excel_import' as const,
    createdBy: userId,
    updatedAt: new Date()
  }))

  // Batch upsert - update if exists, insert if not
  await db
    .insert(forecasts)
    .values(records)
    .onConflictDoUpdate({
      target: [forecasts.skuId, forecasts.retailerId, forecasts.month],
      set: {
        forecastedUnits: sql`excluded.forecasted_units`,
        source: sql`excluded.source`,
        updatedAt: sql`excluded.updated_at`
      }
    })

  return { imported: records.length }
}
```

### Pattern 6: Manual Entry Forms with React Hook Form + Zod
**What:** Typed forms for manual PO/retail order entry with validation
**When to use:** For DAT-03 requirement - manual data entry when Excel or API data unavailable

**Example:**
```typescript
// src/app/(dashboard)/orders/purchase/_components/create-po-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const poFormSchema = z.object({
  poNumber: z.string().min(1, 'PO number required'),
  brandId: z.number(),
  orderDate: z.date(),
  expectedArrival: z.date(),
  lineItems: z.array(z.object({
    skuId: z.number(),
    quantity: z.number().int().min(1),
    unitCost: z.number().min(0)
  })).min(1, 'At least one line item required')
})

export function CreatePOForm() {
  const form = useForm({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      lineItems: [{ skuId: 0, quantity: 1, unitCost: 0 }]
    }
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields using shadcn/ui components */}
    </form>
  )
}
```

### Anti-Patterns to Avoid
- **Client-side parsing:** Never parse Excel files in the browser - security risk, memory issues, exposes parsing logic
- **No validation preview:** Don't commit data immediately - users need to review errors first
- **Synchronous large file parsing:** Don't block server - use streaming for files >1MB or >1000 rows
- **Parsing to objects without header sanitization:** Parse to matrix first, validate headers, then build objects (security best practice)
- **Single try-catch for entire file:** Validate row-by-row to report all errors, not just the first one
- **No format detection:** Don't assume Excel format - detect and route to correct parser

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload UI with drag-drop | Custom file input styling | react-dropzone + shadcn/ui wrapper | Handles drag events, file validation, ARIA, mobile support, paste support |
| Excel cell parsing (dates, formulas, merged cells) | Custom Excel parser | ExcelJS or read-excel-file | Date serial numbers (Excel's 43831 format), formula evaluation, shared strings table, merged cell handling |
| Form validation state | Custom error tracking | React Hook Form + Zod | Field-level errors, touched state, dirty tracking, form-level validation |
| Multi-step form wizard | Custom stepper state | Zustand + react-hook-form FormProvider | State persistence, step validation, back/forward navigation |
| CSV/Excel data normalization | String manipulation | Zod schemas with transforms | Type coercion (string → number), date parsing, whitespace trimming, case normalization |
| Batch database inserts | Loop with individual inserts | Drizzle `.insert().values([array])` with onConflict | Single round-trip, transaction guarantees, proper conflict handling |

**Key insight:** Excel parsing is deceptively complex. Excel stores dates as serial numbers (days since 1900-01-01), formulas need evaluation, merged cells have special handling, and memory grows quickly with large files. ExcelJS handles all these edge cases that would take weeks to implement correctly.

## Common Pitfalls

### Pitfall 1: Memory Explosion with Large Files
**What goes wrong:** Loading entire workbook into memory causes Node.js heap errors or server crashes
**Why it happens:** ExcelJS default API loads full workbook. A 5MB Excel file can consume 50-100MB RAM when parsed
**How to avoid:**
- Set hard file size limits (10MB max for standard parsing)
- Use streaming API for files >5MB or >5000 rows
- Configure Next.js `serverActionsBodySizeLimit` in next.config.js
**Warning signs:** "JavaScript heap out of memory" errors, slow parse times (>5 sec), server timeouts

**Prevention:**
```typescript
// next.config.js
export default {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb' // Increase from 1MB default
    }
  }
}

// Streaming for large files
import { Readable } from 'stream'
const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(fileStream)
for await (const worksheet of workbookReader) {
  // Process one sheet at a time
}
```

### Pitfall 2: Security - Prototype Pollution and Malicious Files
**What goes wrong:** Parsing untrusted Excel files can inject properties into Object.prototype or execute macros
**Why it happens:** Excel formats (especially .xlsm) support macros; parsers may not sanitize header names
**How to avoid:**
- Only accept .xlsx (not .xlsm with macros)
- Parse headers to array first, validate, then map to objects
- Use `Object.create(null)` for parsed records to avoid prototype chain
- Validate file type server-side (don't trust client MIME type)
- Consider scanning for malicious content (macro-enabled files are malware vectors)
**Warning signs:** CVE reports for parsing libraries (SheetJS CVE-2023-30533), prototype pollution vulnerabilities

**Prevention:**
```typescript
// Validate file type server-side
const buffer = await file.arrayBuffer()
const bytes = new Uint8Array(buffer.slice(0, 4))
const signature = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

// .xlsx signature: 504B0304 (ZIP format)
if (signature !== '504b0304') {
  throw new Error('Invalid Excel file - expected .xlsx format')
}

// Sanitize headers before building objects
function sanitizeHeader(header: string): string {
  const sanitized = header.trim().replace(/[^a-zA-Z0-9_]/g, '_')
  if (sanitized === '__proto__' || sanitized === 'constructor') {
    throw new Error(`Dangerous header name: ${header}`)
  }
  return sanitized
}
```

### Pitfall 3: Date Parsing Ambiguity
**What goes wrong:** Excel dates appear as numbers (e.g., 45321) or strings in different formats (MM/DD/YYYY vs DD/MM/YYYY)
**Why it happens:** Excel stores dates as serial numbers (days since 1900-01-01); text dates depend on locale
**How to avoid:**
- Use ExcelJS date detection: `cell.type === ExcelJS.ValueType.Date`
- For text dates, explicitly specify expected format in Zod schema
- Document expected date format in upload instructions
- Show parsed date preview before commit
**Warning signs:** Off-by-one date errors, dates 70+ years in past/future, "Invalid Date" errors

**Prevention:**
```typescript
import { z } from 'zod'

// Zod schema with date coercion and validation
const forecastRowSchema = z.object({
  month: z.coerce.date().refine(date => {
    const now = new Date()
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth())
    const twoYearsAhead = new Date(now.getFullYear() + 2, now.getMonth())
    return date >= twoYearsAgo && date <= twoYearsAhead
  }, 'Date must be within 2 years of today')
})

// ExcelJS cell type checking
if (cell.type === ExcelJS.ValueType.Date) {
  const date = cell.value as Date
} else if (typeof cell.value === 'number') {
  // Excel serial date
  const date = new Date((cell.value - 25569) * 86400 * 1000)
}
```

### Pitfall 4: Master Data Mismatches
**What goes wrong:** Excel contains SKU codes or retailer names that don't exist in database
**Why it happens:** Team uses old SKU codes, typos in retailer names, Excel from before recent master data changes
**How to avoid:**
- Validate against master data during parse (query DB for existing SKUs/retailers)
- Show mismatches as errors with suggestions (fuzzy match)
- Provide option to create missing retailers (but not SKUs - those should be intentional)
- Export current master data as reference template
**Warning signs:** Import succeeds but dashboard shows no data, foreign key constraint errors

**Prevention:**
```typescript
// Fuzzy matching for close names
import { distance } from 'fastest-levenshtein'

async function validateRetailer(name: string): Promise<{ valid: boolean; suggestion?: string }> {
  const existing = await db.select().from(retailers)

  const exactMatch = existing.find(r => r.name.toLowerCase() === name.toLowerCase())
  if (exactMatch) return { valid: true }

  // Find close matches (Levenshtein distance < 3)
  const closeMatches = existing
    .map(r => ({ name: r.name, distance: distance(name, r.name) }))
    .filter(m => m.distance < 3)
    .sort((a, b) => a.distance - b.distance)

  if (closeMatches.length > 0) {
    return {
      valid: false,
      suggestion: `Did you mean "${closeMatches[0].name}"?`
    }
  }

  return { valid: false }
}
```

### Pitfall 5: tRPC and FormData Incompatibility
**What goes wrong:** Attempting to use tRPC mutations for file upload fails or requires hacky workarounds
**Why it happens:** tRPC v11 is designed for JSON payloads, not multipart/form-data
**How to avoid:**
- Use Next.js Server Actions for file upload (native FormData support)
- Call tRPC procedures from within Server Actions for data operations
- Reserve tRPC for JSON-only operations (queries, standard mutations)
- For very large files (>10MB), use presigned S3 URLs instead
**Warning signs:** Base64 encoding files (memory intensive), complex FormData serialization, experimental tRPC features

**Prevention:**
```typescript
// CORRECT: Server Action for upload, tRPC for processing
'use server'

import { api } from '@/trpc/server'

export async function uploadAndImport(formData: FormData) {
  // Parse file in Server Action (FormData native support)
  const file = formData.get('file') as File
  const parsed = await parseExcelFile(file)

  // Use tRPC for data operations (JSON payload)
  return api.import.createForecasts({ rows: parsed.valid })
}

// WRONG: Don't try to pass File through tRPC
const mutation = api.import.upload.useMutation() // Won't work with File objects
```

### Pitfall 6: No Preview Before Commit
**What goes wrong:** Users upload file, data commits immediately, then discover errors and want to undo
**Why it happens:** Skipping validation preview step to "simplify" UX
**How to avoid:**
- Always show validation results with error/warning counts
- Display preview table of first 50 rows before commit
- Provide "Cancel" option at every step until final commit
- Store parsed data in component state, not database, until user confirms
**Warning signs:** Support requests to "undo import", incorrect data in dashboard

## Code Examples

Verified patterns from official sources and research:

### Complete File Upload Server Action
```typescript
// src/server/actions/import-forecast.ts
'use server'

import { revalidatePath } from 'next/cache'
import ExcelJS from 'exceljs'
import { auth } from '@/server/auth'
import { detectFormat, parseRTLForecast, parseHOPForecast } from '@/server/services/parsers'
import { validateForecastRows } from '@/server/services/validators/forecast-validator'
import { importForecasts } from '@/server/services/import-service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
]

export async function importForecastFile(formData: FormData) {
  // Auth check
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')

  // Extract and validate file
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)`)
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type - only .xlsx files accepted')
  }

  // Parse Excel file
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  // Detect format and parse
  const format = detectFormat(workbook)
  const rows = format === 'RTL_FORECAST'
    ? parseRTLForecast(workbook)
    : parseHOPForecast(workbook)

  // Validate rows
  const validation = await validateForecastRows(rows)

  // If errors, return for user review
  if (validation.errors.length > 0) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
      previewData: validation.valid.slice(0, 50) // First 50 for preview
    }
  }

  // Import valid rows
  const result = await importForecasts(validation.valid, session.user.id)

  // Revalidate dashboard to show new data
  revalidatePath('/dashboard/forecasts')

  return {
    success: true,
    imported: result.imported,
    warnings: validation.warnings
  }
}
```

### RTL FORECAST_MASTER Parser
```typescript
// src/server/services/parsers/rtl-forecast.ts
import type { Workbook } from 'exceljs'

export type ParsedRow = {
  retailer: string
  sku: string
  month: Date
  forecastedUnits: number
}

export function parseRTLForecast(workbook: Workbook): ParsedRow[] {
  const rows: ParsedRow[] = []

  // RTL format has monthly sheets (e.g., "Jan 2026 PO", "Feb 2026 PO")
  const poSheets = workbook.worksheets.filter(ws =>
    ws.name.toLowerCase().includes('po') && !ws.name.toLowerCase().includes('summary')
  )

  for (const sheet of poSheets) {
    // Extract month from sheet name (e.g., "Jan 2026 PO" → Date)
    const monthMatch = sheet.name.match(/(\w{3})\s+(\d{4})/)
    if (!monthMatch) continue

    const [_, monthStr, yearStr] = monthMatch
    const month = new Date(`${monthStr} 1, ${yearStr}`)

    // Parse header row (row 1) to get SKU codes
    const headerRow = sheet.getRow(1)
    const skuColumns: Map<number, string> = new Map()

    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString().trim()
      if (value && value.match(/^[A-Z]{2,}-\d+$/)) { // SKU pattern
        skuColumns.set(colNumber, value)
      }
    })

    // Parse data rows (start at row 2)
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header

      const retailerCell = row.getCell(1)
      const retailer = retailerCell.value?.toString().trim()
      if (!retailer) return

      // Parse units for each SKU column
      for (const [colNumber, sku] of skuColumns) {
        const unitsCell = row.getCell(colNumber)
        const units = typeof unitsCell.value === 'number'
          ? unitsCell.value
          : parseInt(unitsCell.value?.toString() || '0', 10)

        if (units > 0) {
          rows.push({ retailer, sku, month, forecastedUnits: units })
        }
      }
    })
  }

  return rows
}
```

### File Upload Dropzone Component
```typescript
// src/app/(dashboard)/import/_components/upload-dropzone.tsx
'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type UploadDropzoneProps = {
  onFileSelected: (file: File) => void
  accept?: Record<string, string[]>
  maxSize?: number
}

export function UploadDropzone({
  onFileSelected,
  accept = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
  },
  maxSize = 10 * 1024 * 1024 // 10MB
}: UploadDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelected(acceptedFiles[0])
    }
  }, [onFileSelected])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections
  } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
    multiple: false
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      )}
    >
      <input {...getInputProps()} />

      <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />

      {isDragActive ? (
        <p className="text-lg font-medium">Drop Excel file here</p>
      ) : (
        <>
          <p className="text-lg font-medium mb-2">
            Drag & drop Excel file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports .xlsx files up to 10MB
          </p>
        </>
      )}

      {fileRejections.length > 0 && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded">
          <p className="text-sm text-destructive font-medium">
            {fileRejections[0].errors[0].message}
          </p>
        </div>
      )}
    </div>
  )
}
```

### Validation Results Display
```typescript
// src/app/(dashboard)/import/_components/validation-results.tsx
'use client'

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

type ValidationResultsProps = {
  errors: Array<{ row: number; field: string; message: string }>
  warnings: Array<{ row: number; message: string }>
  validCount: number
  onContinue: () => void
  onCancel: () => void
}

export function ValidationResults({
  errors,
  warnings,
  validCount,
  onContinue,
  onCancel
}: ValidationResultsProps) {
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{validCount}</p>
              <p className="text-sm text-muted-foreground">Valid rows</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{warnings.length}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold">{errors.length}</p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error list */}
      {hasErrors && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold text-destructive">
              Errors must be fixed before import
            </h3>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-2">
              {errors.map((error, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <span className="font-mono text-muted-foreground">
                    Row {error.row}:
                  </span>
                  <span className="font-medium">{error.field}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Warning list */}
      {hasWarnings && !hasErrors && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold text-yellow-700">
              Warnings (can proceed with caution)
            </h3>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="p-4 space-y-2">
              {warnings.map((warning, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <span className="font-mono text-muted-foreground">
                    Row {warning.row}:
                  </span>
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {!hasErrors && (
          <Button onClick={onContinue}>
            Continue to Preview
          </Button>
        )}
        {hasErrors && (
          <Button variant="destructive" disabled>
            Fix {errors.length} errors to continue
          </Button>
        )}
      </div>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side parsing with FileReader | Server-side parsing with Server Actions | Next.js 13+ (2023) | Security, memory management, keeps parsing logic server-only |
| API routes for file upload | Next.js Server Actions | Next.js 13.4+ (2023) | Simpler API, no manual route config, progressive enhancement |
| Manual form validation | Zod schemas with react-hook-form | 2022-2023 | Type-safe, reusable, co-located validation logic |
| SheetJS (xlsx) | ExcelJS | 2024-2025 | Active maintenance, better TypeScript support, no CVE warnings |
| Prop drilling for multi-step forms | Zustand or React Context | 2023+ | Cleaner state management, step persistence |
| Individual inserts in loop | Batch insert with onConflict | Drizzle ORM v1.0+ | 10-100x faster, proper transactions, conflict handling |

**Deprecated/outdated:**
- **pages/api routes for file upload:** Use App Router Server Actions instead - simpler API, built-in progressive enhancement
- **SheetJS (xlsx):** Use ExcelJS instead - xlsx has security vulnerabilities (CVE-2023-30533), less active maintenance
- **Client-side Excel parsing:** Always parse server-side - security risk, memory issues, exposes parsing logic
- **tRPC for file uploads:** Use Server Actions for FormData - tRPC doesn't natively support multipart, requires hacky workarounds

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Excel format structure for HOP product-centric**
   - What we know: Product-focused layout with retailer breakdowns, different from RTL matrix format
   - What's unclear: Exact column headers, whether multiple sheets or single sheet, product naming conventions
   - Recommendation: Request sample HOP Excel file from team before implementing parser, or implement RTL first and adapt HOP based on actual format

2. **Retail sales data Excel format**
   - What we know: Contains SKU performance tracking data, uploaded for retail sales analysis
   - What's unclear: Exact schema (SKU, date, units sold, revenue?), aggregation level (daily/weekly/monthly?), one retailer per file or multiple?
   - Recommendation: Define schema requirements in PLAN.md based on DAT-04 success criteria, validate with team

3. **Large file handling threshold**
   - What we know: ExcelJS streaming available for large files, 10MB reasonable limit for standard parsing
   - What's unclear: Team's typical file sizes, whether forecasts exceed 5000 rows, if streaming needed in Phase 2 or defer to Phase 3
   - Recommendation: Start with 10MB limit and standard parsing, monitor in production, add streaming if needed

4. **Retailer auto-creation policy**
   - What we know: Validation should flag missing retailers
   - What's unclear: Should import auto-create retailers or require admin to add them first? What if retailer name has typo?
   - Recommendation: Phase 2 should reject missing retailers (hard error), Phase 3 can add fuzzy matching + auto-creation with confirmation

## Sources

### Primary (HIGH confidence)
- [ExcelJS GitHub](https://github.com/exceljs/exceljs) - Features, streaming support, TypeScript
- [Drizzle ORM Upsert Guide](https://orm.drizzle.team/docs/guides/upsert) - onConflictDoUpdate patterns, batch operations
- [shadcn/ui React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form) - Form integration patterns
- [Next.js Server Actions Config](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) - bodySizeLimit configuration

### Secondary (MEDIUM confidence)
- [Next.js Server Actions Complete Guide 2026](https://makerkit.dev/blog/tutorials/nextjs-server-actions) - File upload patterns
- [NPM + SheetJS XLSX in 2026: Safe Installation](https://thelinuxcode.com/npm-sheetjs-xlsx-in-2026-safe-installation-secure-parsing-and-real-world-nodejs-patterns/) - Security patterns, header sanitization
- [Cassotis: 88% of Excel Spreadsheets Have Errors](https://www.cassotis.com/insights/88-of-the-excel-spreadsheets-have-errors) - Validation importance
- [Solving Finance: 90% Spreadsheets Contain Errors](https://www.solving-finance.com/post/90-percent-of-spreadsheets-have-errors) - Error statistics
- [shadcn/ui Dropzone Component](https://www.shadcn.io/components/forms/dropzone) - File upload UI pattern
- [Multi-Step Form Template](https://www.shadcn.io/template/marcosfitzsimons-multi-step-form) - Wizard pattern

### Secondary (MEDIUM confidence) - Library Comparisons
- [npm-compare: Excel4node vs ExcelJS vs XLSX](https://npm-compare.com/excel4node,exceljs,xlsx,xlsx-populate) - Library comparison
- [read-excel-file npm](https://www.npmjs.com/package/read-excel-file) - Alternative parser with schema support
- [zod-xlsx GitHub](https://github.com/sidwebworks/zod-xlsx) - Zod schema validation for XLSX

### Tertiary (LOW confidence)
- [tRPC FormData Discussion](https://github.com/trpc/trpc/discussions/658) - Community workarounds for file upload
- [shadcn-dropzone GitHub](https://github.com/diragb/shadcn-dropzone) - Community file upload component

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ExcelJS, Zod, react-hook-form are well-established with official docs
- Architecture: HIGH - Server Actions for upload, Zod validation, batch upsert are proven patterns
- Excel formats: MEDIUM - RTL format inferred from description, HOP format needs sample file
- Pitfalls: HIGH - Security issues, date parsing, memory management verified across multiple sources

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain, Excel parsing patterns don't change rapidly)
