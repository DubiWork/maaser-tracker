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
  Info,
  EmojiEvents,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { calculateMaaserForEntries, getCurrentMaaserPercentage } from '../utils/maaserCalculation';
import { getAccountingMonthFromDate } from '../services/validation';

function StatCard({ icon, title, value, color = 'primary.main', direction, formatCurrency }) {
  const formattedValue = formatCurrency(value);
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ color, mr: direction === 'ltr' ? 0.5 : 0, ml: direction === 'rtl' ? 0.5 : 0, display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
            {icon}
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.65rem', sm: '0.875rem' }, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
        </Box>
        <Typography
          variant="h5"
          component="div"
          title={formattedValue}
          sx={{
            fontWeight: 600,
            fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.5rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formattedValue}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Get encouraging message based on progress percentage
function getEncouragingMessage(progress, t) {
  if (progress >= 100) return t.encouragementComplete;
  if (progress >= 90) return t.encouragementAlmostThere;
  if (progress >= 75) return t.encouragementGreat;
  if (progress >= 50) return t.encouragementGood;
  return t.encouragementStart;
}

// Celebration Hero Section - emphasizes donations as achievements
function CelebrationHero({ totalDonated, totalIncome, totalMaaserOwed, balance, progress, t, formatCurrency, maaserPercentLabel }) {
  // Determine status for subtle balance indicator
  const getBalanceInfo = () => {
    if (balance > 0) {
      return {
        message: t.moreToComplete.replace('{amount}', formatCurrency(balance)),
        color: 'info.main',
        icon: <Info fontSize="small" />,
      };
    } else if (balance < 0) {
      return {
        message: t.aheadCelebration.replace('{amount}', formatCurrency(Math.abs(balance))),
        color: 'warning.main',
        icon: <EmojiEvents fontSize="small" />,
      };
    } else {
      return {
        message: t.allCurrentCelebration,
        color: 'success.main',
        icon: <CheckCircle fontSize="small" />,
      };
    }
  };

  const balanceInfo = getBalanceInfo();
  const hasDonations = totalDonated > 0;
  const encouragingMessage = getEncouragingMessage(progress, t);

  return (
    <Card
      sx={{
        background: hasDonations
          ? 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)'
          : 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
        color: 'white',
        mb: 2,
      }}
      role="region"
      aria-label={t.donationProgress}
    >
      <CardContent sx={{ py: 3 }}>
        {/* Celebration Message */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              mb: 0.5,
              fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.5rem' },
            }}
            aria-live="polite"
          >
            {hasDonations ? '🎉 ' : ''}{t.donationCelebration.replace('{amount}', formatCurrency(totalDonated))}
          </Typography>
          <Typography variant="body2">
            {encouragingMessage}
          </Typography>
        </Box>

        {/* Stats Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            mb: 2,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ textAlign: 'center', flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {t.totalIncome}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.25rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(totalIncome)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', flex: '1 1 0', minWidth: 0 }}>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {maaserPercentLabel}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.25rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(totalMaaserOwed)}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">
              {t.progress}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                backgroundColor: 'white',
              },
            }}
          />
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            {formatCurrency(totalDonated)} / {formatCurrency(totalMaaserOwed)}
          </Typography>
        </Box>

        {/* Subtle Balance Indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 2,
            pt: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            gap: 0.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {balanceInfo.icon}
          </Box>
          <Typography
            variant="body2"
            role="status"
            aria-live="polite"
          >
            {balanceInfo.message}
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
  const { settings, isLoading: settingsLoading, formatCurrency } = useSettings();

  // Determine the periods to use (fallback to default 10% if settings not loaded)
  const periods = useMemo(
    () => settingsLoading
      ? [{ percentage: 10, effectiveFrom: '2020-01-01' }]
      : settings.maaserPercentagePeriods,
    [settingsLoading, settings.maaserPercentagePeriods]
  );

  // Current percentage for display labels
  const currentPercent = getCurrentMaaserPercentage(periods);

  // Dynamic label: "Ma'aser (X%)" or "מעשר (X%)"
  const maaserPercentLabel = direction === 'rtl'
    ? `מעשר (${currentPercent}%)`
    : `Ma'aser (${currentPercent}%)`;

  // Calculate all-time totals
  const allTimeStats = useMemo(() => {
    const allTimeIncomeEntries = entries.filter(e => e.type === 'income');
    const allTimeIncome = allTimeIncomeEntries.reduce((sum, e) => sum + e.amount, 0);

    const allTimeMaaserOwed = calculateMaaserForEntries(allTimeIncomeEntries, periods);

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
  }, [entries, periods]);

  // Calculate this month's stats
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentAccountingMonth = getAccountingMonthFromDate(now);

    // Filter entries by accounting month (with fallback for entries without accountingMonth)
    const monthlyEntries = entries.filter(entry => {
      const entryAccountingMonth = entry.accountingMonth || getAccountingMonthFromDate(entry.date);
      return entryAccountingMonth === currentAccountingMonth;
    });

    const monthlyIncomeEntries = monthlyEntries.filter(e => e.type === 'income');
    const monthlyIncome = monthlyIncomeEntries.reduce((sum, e) => sum + e.amount, 0);

    const monthlyMaaserOwed = calculateMaaserForEntries(monthlyIncomeEntries, periods);

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
  }, [entries, periods]);

  const currentMonth = t.months[new Date().getMonth()];

  return (
    <Box sx={{ pb: 2 }}>
      {/* Celebration Hero Section */}
      <CelebrationHero
        totalDonated={allTimeStats.totalDonated}
        totalIncome={allTimeStats.totalIncome}
        totalMaaserOwed={allTimeStats.totalMaaserOwed}
        balance={allTimeStats.maaserBalance}
        progress={allTimeStats.progress}
        t={t}
        formatCurrency={formatCurrency}
        maaserPercentLabel={maaserPercentLabel}
      />

      {/* All-Time Stats Grid */}
      <SectionHeader title={t.allTimeTotals} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
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
