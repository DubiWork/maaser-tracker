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

export default function AddDonation({ onAdd, editEntry, onCancel }) {
  const { t } = useLanguage();
  const [date, setDate] = useState(
    editEntry ? format(new Date(editEntry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [amount, setAmount] = useState(editEntry ? editEntry.amount.toString() : '');
  const [note, setNote] = useState(editEntry ? (editEntry.note || '') : '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) {
      setError(t.amountRequired);
      return;
    }
    if (parsedAmount <= 0) {
      setError(t.invalidAmount);
      return;
    }

    onAdd({
      id: editEntry?.id || crypto.randomUUID(),
      date: new Date(date).toISOString(),
      type: 'donation',
      amount: parsedAmount,
      note: note.trim(),
    });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {editEntry ? t.edit : t.addDonation}
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="date"
            label={t.date}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
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
            label={t.note || 'Note / הערה'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.noteOptional || 'Optional note...'}
            sx={{ mb: 3 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              size="large"
              color="success"
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
