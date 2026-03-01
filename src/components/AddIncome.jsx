import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
} from '@mui/material';
import { useLanguage } from '../contexts/useLanguage';
import { format } from 'date-fns';
import { NOTE_MAX_LENGTH, getAccountingMonthFromDate } from '../services/validation';

export default function AddIncome({ onAdd, editEntry, onCancel }) {
  const { t } = useLanguage();
  const [date, setDate] = useState(
    editEntry ? format(new Date(editEntry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [accountingMonth, setAccountingMonth] = useState(
    editEntry?.accountingMonth || getAccountingMonthFromDate(editEntry?.date || new Date())
  );
  const [amount, setAmount] = useState(editEntry ? editEntry.amount.toString() : '');
  const [note, setNote] = useState(editEntry ? (editEntry.note || '') : '');
  const [error, setError] = useState('');
  const [noteError, setNoteError] = useState('');

  const calculatedMaaser = amount ? (parseFloat(amount) * 0.1).toFixed(2) : '0.00';

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNote(value);
    // Clear error when user is typing and within limit
    if (value.length <= NOTE_MAX_LENGTH) {
      setNoteError('');
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDate(newDate);
    // For new entries, auto-sync accounting month with payment date
    if (!editEntry) {
      setAccountingMonth(getAccountingMonthFromDate(newDate));
    }
  };

  const handleAccountingMonthChange = (e) => {
    setAccountingMonth(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setNoteError('');

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) {
      setError(t.amountRequired);
      return;
    }
    if (parsedAmount <= 0) {
      setError(t.invalidAmount);
      return;
    }

    // Validate note length
    if (note.length > NOTE_MAX_LENGTH) {
      setNoteError(t.noteTooLong);
      return;
    }

    onAdd({
      id: editEntry?.id || crypto.randomUUID(),
      date: new Date(date).toISOString(),
      accountingMonth,
      type: 'income',
      amount: parsedAmount,
      maaser: parsedAmount * 0.1,
      note: note.trim(),
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {editEntry ? t.edit : t.addIncome}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="date"
            label={t.paymentDate}
            value={date}
            onChange={handleDateChange}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            type="month"
            label={t.accountingMonth}
            value={accountingMonth}
            onChange={handleAccountingMonthChange}
            helperText={t.accountingMonthHelper}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: '2000-01',
              max: '2099-12'
            }}
          />
          <TextField
            fullWidth
            type="number"
            label={t.amountInShekels}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">₪</InputAdornment>,
            }}
            inputProps={{ step: '0.01', min: '0' }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label={t.note}
            value={note}
            onChange={handleNoteChange}
            placeholder={t.noteOptional}
            error={!!noteError}
            helperText={noteError || `${note.length}/${NOTE_MAX_LENGTH}`}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: NOTE_MAX_LENGTH + 1 }}
          />
          <Box
            sx={{
              bgcolor: 'primary.light',
              color: 'white',
              p: 2,
              borderRadius: 2,
              mb: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2">{t.calculatedMaaser}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              ₪{calculatedMaaser}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
            >
              {t.save}
            </Button>
            {editEntry && (
              <Button
                fullWidth
                variant="outlined"
                onClick={onCancel}
                size="large"
              >
                {t.cancel}
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
