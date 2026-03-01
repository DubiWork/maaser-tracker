import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Divider,
} from '@mui/material';
import {
  AccountBalance,
  Calculate,
  VolunteerActivism,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Stars,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';
import { getAccountingMonthFromDate } from '../services/validation';

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

function BalanceCard({ balance, t, direction, formatCurrency }) {
  // Determine balance status and styling
  const getBalanceStatus = () => {
    if (balance > 0) {
      return {
        label: t.youOwe,
        color: 'error.main',
        bgColor: 'error.lighter',
        icon: <Warning />,
      };
    } else if (balance < 0) {
      return {
        label: t.youHaveCredit,
        color: 'info.main',
        bgColor: 'info.lighter',
        icon: <Stars />,
      };
    } else {
      return {
        label: t.allCurrent,
        color: 'success.main',
        bgColor: 'success.lighter',
        icon: <CheckCircle />,
      };
    }
  };

  const status = getBalanceStatus();
  const displayAmount = Math.abs(balance);

  return (
    <Card
      sx={{
        height: '100%',
        bgcolor: status.bgColor,
        border: 2,
        borderColor: status.color,
      }}
      role="region"
      aria-label={t.maaserBalance}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            sx={{
              color: status.color,
              mr: direction === 'ltr' ? 1 : 0,
              ml: direction === 'rtl' ? 1 : 0,
            }}
          >
            {status.icon}
          </Box>
          <Typography variant="body2" sx={{ color: status.color, fontWeight: 600 }}>
            {t.maaserBalance}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 700, color: status.color }}
            aria-live="polite"
          >
            {balance === 0 ? '' : formatCurrency(displayAmount)}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ color: status.color, fontWeight: 500 }}
          >
            {status.label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2, mt: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export default function Dashboard({ entries }) {
  const { t, direction } = useLanguage();

  // Calculate all-time totals
  const allTimeStats = useMemo(() => {
    const allTimeIncome = entries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const allTimeMaaserOwed = allTimeIncome * 0.1;

    const allTimeDonated = entries
      .filter(e => e.type === 'donation')
      .reduce((sum, e) => sum + e.amount, 0);

    // Balance: positive = owe, negative = credit, zero = current
    const maaserBalance = allTimeMaaserOwed - allTimeDonated;

    // Progress based on all-time totals (capped at 100%)
    const progress = allTimeMaaserOwed > 0
      ? Math.min(100, (allTimeDonated / allTimeMaaserOwed) * 100)
      : 0;

    return {
      totalIncome: allTimeIncome,
      totalMaaserOwed: allTimeMaaserOwed,
      totalDonated: allTimeDonated,
      maaserBalance,
      progress,
    };
  }, [entries]);

  // Calculate this month's stats
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentAccountingMonth = getAccountingMonthFromDate(now);

    // Filter entries by accounting month (with fallback for entries without accountingMonth)
    const monthlyEntries = entries.filter(entry => {
      const entryAccountingMonth = entry.accountingMonth || getAccountingMonthFromDate(entry.date);
      return entryAccountingMonth === currentAccountingMonth;
    });

    const monthlyIncome = monthlyEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const monthlyMaaserOwed = monthlyIncome * 0.1;

    const monthlyDonated = monthlyEntries
      .filter(e => e.type === 'donation')
      .reduce((sum, e) => sum + e.amount, 0);

    // Net change for the month (can be positive or negative)
    const netChange = monthlyDonated - monthlyMaaserOwed;

    // Monthly progress (capped at 100%)
    const progress = monthlyMaaserOwed > 0
      ? Math.min(100, (monthlyDonated / monthlyMaaserOwed) * 100)
      : (monthlyDonated > 0 ? 100 : 0);

    return {
      income: monthlyIncome,
      maaserOwed: monthlyMaaserOwed,
      donated: monthlyDonated,
      netChange,
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
      {/* All-Time Totals Section */}
      <SectionHeader title={t.allTimeTotals} />

      {/* Ma'aser Balance Card - Most Prominent */}
      <Box sx={{ mb: 2 }}>
        <BalanceCard
          balance={allTimeStats.maaserBalance}
          t={t}
          direction={direction}
          formatCurrency={formatCurrency}
        />
      </Box>

      {/* All-Time Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={4}>
          <StatCard
            icon={<AccountBalance />}
            title={t.totalIncome}
            value={allTimeStats.totalIncome}
            color="primary.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={4}>
          <StatCard
            icon={<Calculate />}
            title={t.totalMaaserOwed}
            value={allTimeStats.totalMaaserOwed}
            color="secondary.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={4}>
          <StatCard
            icon={<VolunteerActivism />}
            title={t.totalDonatedAllTime}
            value={allTimeStats.totalDonated}
            color="success.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
      </Grid>

      {/* All-Time Progress Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t.totalDonatedAllTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(allTimeStats.progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={allTimeStats.progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                backgroundColor: allTimeStats.progress >= 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(allTimeStats.totalDonated)} / {formatCurrency(allTimeStats.totalMaaserOwed)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* This Month Section */}
      <SectionHeader
        title={t.thisMonth}
        subtitle={`${currentMonth} ${new Date().getFullYear()}`}
      />

      <Grid container spacing={2}>
        <Grid size={6}>
          <StatCard
            icon={<AccountBalance />}
            title={t.incomeThisMonth}
            value={monthlyStats.income}
            color="primary.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={6}>
          <StatCard
            icon={<Calculate />}
            title={t.maaserOwedThisMonth}
            value={monthlyStats.maaserOwed}
            color="secondary.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={6}>
          <StatCard
            icon={<VolunteerActivism />}
            title={t.donatedThisMonth}
            value={monthlyStats.donated}
            color="success.main"
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
        <Grid size={6}>
          <StatCard
            icon={monthlyStats.netChange >= 0 ? <TrendingUp /> : <TrendingDown />}
            title={t.netChangeThisMonth}
            value={monthlyStats.netChange}
            color={monthlyStats.netChange >= 0 ? 'success.main' : 'warning.main'}
            direction={direction}
            formatCurrency={formatCurrency}
          />
        </Grid>
      </Grid>

      {/* Monthly Progress Bar */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t.donatedThisMonth}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(monthlyStats.progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={monthlyStats.progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                backgroundColor: monthlyStats.progress >= 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(monthlyStats.donated)} / {formatCurrency(monthlyStats.maaserOwed)}
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
