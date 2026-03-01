import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import { Edit, Delete, AccountBalance, VolunteerActivism } from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';
import { getAccountingMonthFromDate } from '../services/validation';

/**
 * Format accounting month to display format (e.g., "February 2024")
 */
function formatAccountingMonth(accountingMonth, _locale, months) {
  if (!accountingMonth) return '';
  const [year, month] = accountingMonth.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex]} ${year}`;
}

/**
 * Check if accounting month differs from payment date month
 */
function doesAccountingMonthDiffer(entry) {
  if (!entry.accountingMonth || !entry.date) return false;
  const dateAccountingMonth = getAccountingMonthFromDate(entry.date);
  return entry.accountingMonth !== dateAccountingMonth;
}

export default function History({ entries, onEdit, onDelete }) {
  const { t, language, direction } = useLanguage();
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entry: null });

  const locale = language === 'he' ? he : enUS;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(direction === 'rtl' ? 'he-IL' : 'en-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const handleDeleteClick = (entry) => {
    setDeleteDialog({ open: true, entry });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.entry) {
      onDelete(deleteDialog.entry.id);
    }
    setDeleteDialog({ open: false, entry: null });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, entry: null });
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {t.noEntries}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <List sx={{ p: 0 }}>
          {sortedEntries.map((entry, index) => {
            const showDifferentDates = doesAccountingMonthDiffer(entry);
            const accountingMonthDisplay = entry.accountingMonth
              ? formatAccountingMonth(entry.accountingMonth, locale, t.months)
              : format(new Date(entry.date), 'MMMM yyyy', { locale });

            return (
              <Box key={entry.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: 2,
                    px: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mr: direction === 'ltr' ? 2 : 0,
                      ml: direction === 'rtl' ? 2 : 0,
                      color: entry.type === 'income' ? 'primary.main' : 'success.main',
                    }}
                  >
                    {entry.type === 'income' ? (
                      <AccountBalance />
                    ) : (
                      <VolunteerActivism />
                    )}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatCurrency(entry.amount)}
                        </Typography>
                        <Chip
                          label={entry.type === 'income' ? t.income : t.donation}
                          size="small"
                          color={entry.type === 'income' ? 'primary' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {accountingMonthDisplay}
                        </Typography>
                        {showDifferentDates && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {t.paidOn}{format(new Date(entry.date), 'PPP', { locale })}
                          </Typography>
                        )}
                        {entry.type === 'income' && entry.maaser && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {t.maaser}: {formatCurrency(entry.maaser)}
                          </Typography>
                        )}
                        {entry.note && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                            {entry.note}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => onEdit(entry)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteClick(entry)}
                      size="small"
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Box>
            );
          })}
        </List>
      </Card>

      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
        <DialogTitle>{t.confirmDelete}</DialogTitle>
        <DialogContent>
          {deleteDialog.entry && (
            <Typography>
              {deleteDialog.entry.type === 'income' ? t.income : t.donation}:{' '}
              {formatCurrency(deleteDialog.entry.amount)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>{t.no}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t.yes}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
