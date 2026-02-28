import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  AccountBalance,
  Calculate,
  VolunteerActivism,
  Pending,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';

function StatCard({ icon, title, value, color = 'primary.main', direction, formatCurrency }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color, mr: direction === 'ltr' ? 1 : 0, ml: direction === 'rtl' ? 1 : 0 }}>
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          {formatCurrency(value)}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ entries }) {
  const { t, direction } = useLanguage();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === currentMonth &&
             entryDate.getFullYear() === currentYear;
    });

    const totalIncome = monthlyEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const maaserOwed = totalIncome * 0.1;

    const totalDonated = monthlyEntries
      .filter(e => e.type === 'donation')
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = Math.max(0, maaserOwed - totalDonated);
    const progress = maaserOwed > 0 ? Math.min(100, (totalDonated / maaserOwed) * 100) : 0;

    return {
      totalIncome,
      maaserOwed,
      totalDonated,
      remaining,
      progress,
    };
  }, [entries]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(direction === 'rtl' ? 'he-IL' : 'en-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const currentMonth = t.months[new Date().getMonth()];

  return (
    <Box sx={{ pb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
        {currentMonth} {new Date().getFullYear()}
      </Typography>

      <Grid container spacing={2}>
        <Grid size={6}>
          <StatCard
            icon={<AccountBalance />}
            title={t.incomeThisMonth}
            value={stats.totalIncome}
            color="primary.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={6}>
          <StatCard
            icon={<Calculate />}
            title={t.maaserOwed}
            value={stats.maaserOwed}
            color="secondary.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={6}>
          <StatCard
            icon={<VolunteerActivism />}
            title={t.totalDonated}
            value={stats.totalDonated}
            color="success.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={6}>
          <StatCard
            icon={<Pending />}
            title={t.remainingToDonate}
            value={stats.remaining}
            color={stats.remaining > 0 ? 'warning.main' : 'success.main'}
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
      </Grid>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t.remainingToDonate}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(stats.progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={stats.progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                backgroundColor: stats.progress >= 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(stats.totalDonated)} / {formatCurrency(stats.maaserOwed)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {entries.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
          <Typography variant="body1">{t.noDataYet}</Typography>
          <Typography variant="body2">{t.addFirstIncome}</Typography>
        </Box>
      )}
    </Box>
  );
}
