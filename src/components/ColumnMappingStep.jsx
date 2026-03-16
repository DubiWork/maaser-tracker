/**
 * ColumnMappingStep Component
 *
 * Wizard step for mapping external CSV columns to Ma'aser Tracker fields.
 * Displays auto-detected column mappings with confidence badges, allows
 * manual override via dropdowns, and shows a preview table of transformed values.
 *
 * Features:
 * - Auto-detected mapping with confidence badges (high/medium/low)
 * - MUI Select dropdowns for each target field
 * - Preview table with raw and transformed values
 * - Import summary (income entries, donation entries, skipped rows)
 * - Validation: date + income columns required
 * - Full RTL support (Hebrew/English)
 * - Responsive: mobile 375px+
 * - Keyboard accessible
 */

import { useState, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useLanguage } from '../contexts/useLanguage';
import { parseCurrencyAmount, parseExternalDate } from '../services/columnMappingService';

/** Target fields that can be mapped from CSV columns */
const TARGET_FIELDS = ['date', 'income', 'maaser', 'donation'];

/** Fields that must be mapped for a valid import */
const REQUIRED_FIELDS = ['date', 'income'];

/** Special value for "skip this column" option */
const SKIP_VALUE = '__skip__';

/** Maximum preview rows to display */
const MAX_PREVIEW_ROWS = 3;

/**
 * Get the confidence chip props (color, icon, label) for a field.
 */
function getConfidenceChipProps(confidence, ext) {
  switch (confidence) {
    case 'high':
      return {
        label: ext?.highConfidence || 'High confidence',
        color: 'success',
        icon: <CheckCircleIcon />,
      };
    case 'medium':
      return {
        label: ext?.mediumConfidence || 'Medium confidence',
        color: 'warning',
        icon: <WarningAmberIcon />,
      };
    case 'low':
      return {
        label: ext?.lowConfidence || 'Low confidence',
        color: 'default',
        icon: <ErrorOutlineIcon />,
        sx: { bgcolor: 'warning.light', color: 'warning.contrastText' },
      };
    default:
      return {
        label: ext?.unmapped || 'Not mapped',
        color: 'default',
        icon: <RemoveCircleOutlineIcon />,
      };
  }
}

/**
 * Get the display label for a target field.
 */
function getFieldLabel(field, ext) {
  switch (field) {
    case 'date':
      return ext?.dateColumn || 'Date';
    case 'income':
      return ext?.incomeColumn || 'Income Amount';
    case 'maaser':
      return ext?.maaserColumn || "Ma'aser (10%)";
    case 'donation':
      return ext?.donationColumn || 'Donation Amount';
    default:
      return field;
  }
}

/**
 * Try to transform a raw cell value for preview display.
 * Returns { display, error } where error is true if parsing failed.
 */
function transformPreviewValue(field, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return { display: '-', error: false };
  }

  if (field === 'date') {
    const result = parseExternalDate(String(rawValue));
    if (result) {
      return { display: result.date, error: false };
    }
    return { display: String(rawValue), error: true };
  }

  if (field === 'income' || field === 'maaser' || field === 'donation') {
    const result = parseCurrencyAmount(rawValue);
    if (result !== null) {
      return { display: String(result), error: false };
    }
    return { display: String(rawValue), error: true };
  }

  return { display: String(rawValue), error: false };
}

function ColumnMappingStep({
  headers,
  sampleRows,
  detectionResult,
  onConfirm,
  onBack,
}) {
  const { t, direction } = useLanguage();
  const ext = useMemo(() => t.settings?.externalImport || {}, [t]);

  // Initialize mappings from detection result
  const [mappings, setMappings] = useState(() => {
    const initial = {};
    for (const field of TARGET_FIELDS) {
      if (detectionResult?.mappings?.[field] !== undefined) {
        initial[field] = detectionResult.mappings[field];
      } else {
        initial[field] = SKIP_VALUE;
      }
    }
    return initial;
  });

  // Derive which CSV column indices are currently used
  const usedColumns = useMemo(() => {
    const used = new Set();
    for (const field of TARGET_FIELDS) {
      const val = mappings[field];
      if (val !== SKIP_VALUE && val !== undefined) {
        used.add(val);
      }
    }
    return used;
  }, [mappings]);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors = [];
    for (const field of REQUIRED_FIELDS) {
      if (mappings[field] === SKIP_VALUE) {
        if (field === 'date') {
          errors.push(ext?.noDateColumn || 'Date column is required');
        } else if (field === 'income') {
          errors.push(ext?.noIncomeColumn || 'Income column is required');
        }
      }
    }
    // Check duplicate mappings
    const seen = new Map();
    for (const field of TARGET_FIELDS) {
      const val = mappings[field];
      if (val !== SKIP_VALUE) {
        if (seen.has(val)) {
          errors.push(ext?.duplicateMapping || 'Column already mapped to another field');
          break;
        }
        seen.set(val, field);
      }
    }
    return errors;
  }, [mappings, ext]);

  const isValid = validationErrors.length === 0;

  // Compute import summary from sample data
  const importSummary = useMemo(() => {
    if (!sampleRows || sampleRows.length === 0) {
      return { totalRows: 0, incomeEntries: 0, donationEntries: 0, skipped: 0 };
    }

    let incomeEntries = 0;
    let donationEntries = 0;
    let skipped = 0;

    const effectiveMappings = {};
    for (const field of TARGET_FIELDS) {
      if (mappings[field] !== SKIP_VALUE) {
        effectiveMappings[field] = mappings[field];
      }
    }

    for (const row of sampleRows) {
      const dateRaw = effectiveMappings.date !== undefined ? row[effectiveMappings.date] : undefined;
      const dateResult = parseExternalDate(dateRaw);
      if (!dateResult) {
        skipped++;
        continue;
      }

      const incomeRaw = effectiveMappings.income !== undefined ? row[effectiveMappings.income] : undefined;
      const incomeAmount = parseCurrencyAmount(incomeRaw);
      if (incomeAmount === null || incomeAmount === 0) {
        skipped++;
        continue;
      }

      incomeEntries++;

      const donationRaw = effectiveMappings.donation !== undefined ? row[effectiveMappings.donation] : undefined;
      const donationAmount = parseCurrencyAmount(donationRaw);
      if (donationAmount !== null && donationAmount > 0) {
        donationEntries++;
      }
    }

    return {
      totalRows: sampleRows.length,
      incomeEntries,
      donationEntries,
      skipped,
    };
  }, [sampleRows, mappings]);

  const handleMappingChange = useCallback((field, value) => {
    setMappings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    const finalMappings = {};
    for (const field of TARGET_FIELDS) {
      if (mappings[field] !== SKIP_VALUE) {
        finalMappings[field] = mappings[field];
      }
    }
    onConfirm(finalMappings);
  }, [mappings, onConfirm]);

  const previewRows = useMemo(() => {
    if (!sampleRows) return [];
    return sampleRows.slice(0, MAX_PREVIEW_ROWS);
  }, [sampleRows]);

  return (
    <Box
      sx={{ width: '100%' }}
      dir={direction}
      data-testid="column-mapping-step"
    >
      {/* Header section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6" component="h2">
            {ext?.mapColumns || 'Map Columns'}
          </Typography>
          <Tooltip
            title={ext?.columnMappingHelp || 'Select which column in your CSV corresponds to each field. Columns are auto-detected from headers.'}
            arrow
          >
            <HelpOutlineIcon
              fontSize="small"
              color="action"
              sx={{ cursor: 'help' }}
              aria-label={ext?.columnMappingHelp || 'Column mapping help'}
            />
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {ext?.mapColumnsDescription || 'Match your CSV columns to the app fields'}
        </Typography>
      </Box>

      {/* Mapping section */}
      <Box sx={{ mb: 3 }}>
        {TARGET_FIELDS.map((field) => {
          const confidence = detectionResult?.confidence?.[field];
          const chipProps = getConfidenceChipProps(confidence, ext);
          const currentValue = mappings[field];
          const sampleValue = currentValue !== SKIP_VALUE && sampleRows?.[0]
            ? sampleRows[0][currentValue]
            : undefined;
          const isRequired = REQUIRED_FIELDS.includes(field);
          const labelId = `mapping-label-${field}`;
          const selectId = `mapping-select-${field}`;

          return (
            <Box
              key={field}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                mb: 2,
                flexWrap: 'wrap',
              }}
              data-testid={`mapping-row-${field}`}
            >
              <FormControl
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 200 }, flex: { sm: '0 0 200px' } }}
              >
                <InputLabel id={labelId}>
                  {getFieldLabel(field, ext)}
                  {isRequired ? ' *' : ''}
                </InputLabel>
                <Select
                  labelId={labelId}
                  id={selectId}
                  value={currentValue}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  label={`${getFieldLabel(field, ext)}${isRequired ? ' *' : ''}`}
                  data-testid={`mapping-select-${field}`}
                >
                  <MenuItem value={SKIP_VALUE}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      {ext?.skipColumn || 'Skip this column'}
                    </Typography>
                  </MenuItem>
                  {headers?.map((header, idx) => (
                    <MenuItem
                      key={idx}
                      value={idx}
                      disabled={usedColumns.has(idx) && mappings[field] !== idx}
                    >
                      {header || `Column ${idx + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Chip
                {...chipProps}
                size="small"
                variant="outlined"
                data-testid={`confidence-badge-${field}`}
              />

              {sampleValue !== undefined && sampleValue !== null && sampleValue !== '' && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 150,
                    unicodeBidi: 'isolate',
                  }}
                  data-testid={`sample-value-${field}`}
                >
                  {String(sampleValue)}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="validation-errors">
          {validationErrors.map((err, idx) => (
            <Typography key={idx} variant="body2" component="div">
              {err}
            </Typography>
          ))}
        </Alert>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Preview table */}
      {previewRows.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {ext?.previewMappedData || 'Preview mapped data'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {(ext?.showingFirstRows || 'Showing first {count} rows')
              .replace('{count}', String(previewRows.length))}
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <Table size="small" stickyHeader aria-label={ext?.previewMappedData || 'Preview mapped data'}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                  {TARGET_FIELDS.filter((f) => mappings[f] !== SKIP_VALUE).map((field) => (
                    <TableCell key={field} sx={{ fontWeight: 600 }}>
                      {getFieldLabel(field, ext)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    <TableCell>{rowIdx + 1}</TableCell>
                    {TARGET_FIELDS.filter((f) => mappings[f] !== SKIP_VALUE).map((field) => {
                      const colIdx = mappings[field];
                      const rawValue = row[colIdx];
                      const { display, error } = transformPreviewValue(field, rawValue);
                      return (
                        <TableCell
                          key={field}
                          sx={error ? { bgcolor: 'error.light', color: 'error.contrastText' } : {}}
                          data-testid={error ? `parse-error-${field}-${rowIdx}` : undefined}
                        >
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', unicodeBidi: 'isolate' }}>
                              {rawValue !== undefined && rawValue !== null ? String(rawValue) : '-'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {display}
                            </Typography>
                          </Box>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Summary section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {ext?.totalEntries || 'Total entries to create'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2">
            {ext?.incomeEntries || 'Income entries'}: {importSummary.incomeEntries}
          </Typography>
          <Typography variant="body2">
            {ext?.donationEntries || 'Donation entries'}: {importSummary.donationEntries}
          </Typography>
          {importSummary.skipped > 0 && (
            <Typography variant="body2" color="warning.main">
              {ext?.skippedRows || 'Skipped rows'}: {importSummary.skipped}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{ textTransform: 'none' }}
          data-testid="back-button"
        >
          {ext?.backToFileSelect || 'Back to file selection'}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!isValid}
          sx={{ textTransform: 'none' }}
          data-testid="confirm-button"
        >
          {ext?.confirmMapping || 'Confirm Mapping'}
        </Button>
      </Box>
    </Box>
  );
}

export default memo(ColumnMappingStep);
