import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCurrentNetWorth,
  fetchHistory,
  takeSnapshot,
} from '../store/netWorthSlice';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  TrendingUp,
  TrendingDown,
  Camera,
  RefreshCw,
  Wallet,
  Coins,
  Landmark,
  CreditCard,
  History,
} from 'lucide-react-native';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const BreakdownRow = ({ name, type, value, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLeft}>
        <Text style={styles.breakdownName} numberOfLines={1}>
          {name}
        </Text>
        {type ? <Text style={styles.breakdownType}>{type}</Text> : null}
      </View>
      <View style={styles.breakdownBarTrack}>
        <View style={[styles.breakdownBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.breakdownValue}>{formatCurrency(value)}</Text>
    </View>
  );
};

const NetWorthScreen = () => {
  const dispatch = useDispatch();
  const { current, history, isLoading, error } = useSelector(
    (state) => state.netWorth
  );

  const [refreshing, setRefreshing] = useState(false);
  const [snapping, setSnapping] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchCurrentNetWorth()),
      dispatch(fetchHistory()),
    ]);
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleTakeSnapshot = async () => {
    setSnapping(true);
    try {
      await dispatch(takeSnapshot({})).unwrap();
      Alert.alert('Snapshot Saved', 'Current Net Worth snapshot has been saved to your timeline.');
    } catch {
      Alert.alert('Failed', 'Could not save snapshot.');
    } finally {
      setSnapping(false);
    }
  };

  const netWorth = current?.netWorth || 0;
  const isPositive = netWorth >= 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.screenTitle}>Net Worth</Text>
            <Text style={styles.screenSubtitle}>
              Total Assets − Total Liabilities overview.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.snapshotBtn}
            onPress={handleTakeSnapshot}
            disabled={snapping}
          >
            <Camera size={15} color="#FFFFFF" />
            <Text style={styles.snapshotBtnText}>
              {snapping ? 'Saving...' : 'Snapshot'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero Net Worth Card */}
        <View
          style={[
            styles.heroCard,
            isPositive ? styles.heroPositive : styles.heroNegative,
          ]}
        >
          <Text style={styles.heroLabel}>CURRENT NET WORTH</Text>
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroAmount}>{formatCurrency(netWorth)}</Text>
            {isPositive ? (
              <TrendingUp size={28} color="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <TrendingDown size={28} color="#FFFFFF" strokeWidth={2.5} />
            )}
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatLabel}>Total Assets</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(current?.totalAssets || 0)}
              </Text>
            </View>

            <View style={[styles.heroStatCol, styles.heroStatBorder]}>
              <Text style={styles.heroStatLabel}>Total Liabilities</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(current?.totalLiabilities || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Stat Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            {/* Cash & Bank */}
            <View style={[styles.statCard, { flex: 1 }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Cash & Bank</Text>
                <View style={[styles.statIcon, { backgroundColor: COLORS.successBg }]}>
                  <Wallet size={15} color={COLORS.success} />
                </View>
              </View>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {formatCurrency(current?.cashAndBankBalances || 0)}
              </Text>
            </View>

            {/* Investments */}
            <View style={[styles.statCard, { flex: 1 }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Investments</Text>
                <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Coins size={15} color={COLORS.primary} />
                </View>
              </View>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {formatCurrency(current?.investmentValue || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            {/* Loans */}
            <View style={[styles.statCard, { flex: 1 }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>Loan Debt</Text>
                <View style={[styles.statIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Landmark size={15} color="#EA580C" />
                </View>
              </View>
              <Text style={[styles.statValue, { color: '#EA580C' }]}>
                {formatCurrency(current?.loanBalances || 0)}
              </Text>
            </View>

            {/* Credit Card Outstanding */}
            <View style={[styles.statCard, { flex: 1 }]}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>CC Outstanding</Text>
                <View style={[styles.statIcon, { backgroundColor: COLORS.dangerBg }]}>
                  <CreditCard size={15} color={COLORS.danger} />
                </View>
              </View>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>
                {formatCurrency(current?.creditCardBalances || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Breakdown Sections */}
        {current?.breakdown && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Assets & Holdings</Text>
            {/* Accounts */}
            {current.breakdown.accounts?.filter((a) => a.balance > 0).map((a, i) => (
              <BreakdownRow
                key={`acc-${i}`}
                name={a.name}
                type={a.type}
                value={a.balance}
                total={current.totalAssets}
              />
            ))}
            {/* Investments */}
            {current.breakdown.investments?.map((inv, i) => (
              <BreakdownRow
                key={`inv-${i}`}
                name={inv.name}
                type={inv.type}
                value={inv.value}
                total={current.totalAssets}
              />
            ))}
            {current.otherAssets > 0 && (
              <BreakdownRow
                name="Receivables (Lent)"
                type="Lending"
                value={current.otherAssets}
                total={current.totalAssets}
              />
            )}
          </View>
        )}

        {/* Liabilities Breakdown */}
        {current?.breakdown && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Liabilities & Debts</Text>
            {current.breakdown.loans?.map((l, i) => (
              <BreakdownRow
                key={`loan-${i}`}
                name={l.name}
                type={l.type}
                value={l.remaining}
                total={current.totalLiabilities}
              />
            ))}
            {current.creditCardBalances > 0 && (
              <BreakdownRow
                name="Credit Card & Borrowed Debt"
                type="Liabilities"
                value={current.creditCardBalances}
                total={current.totalLiabilities}
              />
            )}
          </View>
        )}

        {/* Snapshot History */}
        {history.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.historyHeaderRow}>
              <History size={16} color={COLORS.textSecondary} />
              <Text style={styles.sectionTitle}>Snapshot Timeline ({history.length})</Text>
            </View>

            <View style={styles.historyList}>
              {history.slice().reverse().map((snap) => (
                <View key={snap._id} style={styles.snapItem}>
                  <View>
                    <Text style={styles.snapDate}>{formatDate(snap.date)}</Text>
                    <Text style={styles.snapSub}>
                      Assets: {formatCurrency(snap.totalAssets)} · Debt: {formatCurrency(snap.totalLiabilities)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.snapNetWorth,
                      snap.netWorth >= 0 ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    {formatCurrency(snap.netWorth)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  screenSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  snapshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  snapshotBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  heroPositive: {
    backgroundColor: '#0D9488',
  },
  heroNegative: {
    backgroundColor: '#E11D48',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.8,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
  },
  heroStatCol: {
    flex: 1,
  },
  heroStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    paddingLeft: 16,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownLeft: {
    flex: 1,
    marginRight: 8,
  },
  breakdownName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  breakdownType: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  breakdownBarTrack: {
    width: 60,
    height: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  breakdownBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    width: 90,
    textAlign: 'right',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  historyList: {
    gap: 8,
  },
  snapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  snapDate: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  snapSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  snapNetWorth: {
    fontSize: 14,
    fontWeight: '800',
  },
  textGreen: {
    color: COLORS.success,
  },
  textRed: {
    color: COLORS.danger,
  },
});

export default NetWorthScreen;
