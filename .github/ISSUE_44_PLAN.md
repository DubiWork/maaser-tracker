# Issue #44: Accounting Month Field - Implementation Plan

## Overview
Add accounting month field separate from payment date to enable accurate monthly ma'aser calculations for end-of-month salaries.

## Implementation Phases

### Phase 1: Schema & Migration
- Add `accountingMonth` field to entry schema
- Keep existing `date` field (rename to `paymentDate` conceptually)
- Migrate existing entries to set accountingMonth from date
- Update IndexedDB service layer

### Phase 2: UI Components
- Add accounting month picker to IncomeForm
- Add accounting month picker to DonationForm
- Default to payment date's month
- Support Hebrew/English labels

### Phase 3: Calculations
- Update Dashboard to use accountingMonth for calculations
- Update monthly totals grouping
- Update ma'aser calculations

### Phase 4: History Display
- Show both dates when different
- Add filter/sort by accounting month option
- Update date display format

### Phase 5: Testing
- Unit tests for calculations
- Migration tests
- Component tests
- Integration tests

## Files to Modify
1. `src/services/db.js` - Schema and migration
2. `src/components/IncomeForm.jsx` - Add accounting month picker
3. `src/components/DonationForm.jsx` - Add accounting month picker
4. `src/services/dataService.js` - Update calculations
5. `src/components/Dashboard.jsx` - Use accountingMonth
6. `src/components/History.jsx` - Display both dates
7. `src/contexts/LanguageProvider.jsx` - Add translations
8. Tests for all above

## Starting Implementation
Branch: feature/44-accounting-month-field
Status: Planning Complete ✅
