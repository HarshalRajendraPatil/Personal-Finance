import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useSelector } from 'react-redux';
import reportService from '../services/reportService';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  Filter,
  FileDown,
  BarChart3,
  Calendar,
} from 'lucide-react-native';

const getDefaultDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const end = now.toISOString().split('T')[0];
  return { start, end };
};

const ReportsScreen = () => {
  const { accounts } = useSelector((state) => state.accounts);
  const defaults = getDefaultDates();

  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [type, setType] = useState('Expense');
  const [selectedAccount, setSelectedAccount] = useState('');

  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReportsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, c, t] = await Promise.all([
        reportService.getSummary({
          startDate,
          endDate,
          account: selectedAccount || undefined,
        }),
        reportService.getByCategory({
          startDate,
          endDate,
          type,
          account: selectedAccount || undefined,
        }),
        reportService.getMonthlyTrend({ months: 6 }),
      ]);
      setSummary(s);
      setByCategory(c || []);
      setTrend(t || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, type, selectedAccount]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReportsData();
    setRefreshing(false);
  }, [fetchReportsData]);

  const handleExportCsv = async () => {
    try {
      const csvText = await reportService.exportCsv({
        startDate,
        endDate,
        account: selectedAccount || undefined,
      });

      if (csvText) {
        await Share.share({
          title: `Transactions_${startDate}_${endDate}.csv`,
          message: csvText,
        });
      }
    } catch (err) {
      Alert.alert('Export Failed', 'Could not export CSV file.');
    }
  };

  const maxCatTotal =
    byCategory.length > 0 ? byCategory[0].total || 1 : 1;

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
            <Text style={styles.screenTitle}>Reports & Insights</Text>
            <Text style={styles.screenSubtitle}>
              Analyze cash flow, category spending, and exports.
            </Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
            <FileDown size={16} color={COLORS.primary} />
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.filterCardTitle}>Date Range & Scope</Text>
          <View style={styles.rowTwoCols}>
            <View style={styles.colHalf}>
              <Text style={styles.filterLabel}>From Date</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textLight}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>
            <View style={styles.colHalf}>
              <Text style={styles.filterLabel}>To Date</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textLight}
                value={endDate}
                onChangeText={setEndDate}
              />
            </View>
          </View>

          {/* Account Filter Chips */}
          <View style={styles.accountFilterSection}>
            <Text style={styles.filterLabel}>Account</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <TouchableOpacity
                onPress={() => setSelectedAccount('')}
                style={[
                  styles.chip,
                  !selectedAccount && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    !selectedAccount && styles.chipTextActive,
                  ]}
                >
                  All Accounts
                </Text>
              </TouchableOpacity>
              {accounts.map((a) => {
                const isSelected = selectedAccount === a._id;
                return (
                  <TouchableOpacity
                    key={a._id}
                    onPress={() => setSelectedAccount(a._id)}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.applyBtn}
            onPress={fetchReportsData}
            disabled={isLoading}
          >
            <Filter size={15} color="#FFFFFF" />
            <Text style={styles.applyBtnText}>
              {isLoading ? 'Updating...' : 'Apply Filters'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary 4 Cards Grid */}
        {summary ? (
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              {/* Income */}
              <View style={[styles.statCard, { flex: 1 }]}>
                <View style={styles.statCardHeader}>
                  <Text style={styles.statLabel}>Total Income</Text>
                  <View style={[styles.statIconBox, { backgroundColor: COLORS.successBg }]}>
                    <TrendingUp size={16} color={COLORS.success} />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {formatCurrency(summary.income || 0)}
                </Text>
              </View>

              {/* Expenses */}
              <View style={[styles.statCard, { flex: 1 }]}>
                <View style={styles.statCardHeader}>
                  <Text style={styles.statLabel}>Total Expenses</Text>
                  <View style={[styles.statIconBox, { backgroundColor: COLORS.dangerBg }]}>
                    <TrendingDown size={16} color={COLORS.danger} />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: COLORS.danger }]}>
                  {formatCurrency(summary.expenses || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              {/* Net Savings */}
              <View style={[styles.statCard, { flex: 1 }]}>
                <View style={styles.statCardHeader}>
                  <Text style={styles.statLabel}>Net Savings</Text>
                  <View style={[styles.statIconBox, { backgroundColor: COLORS.primaryLight }]}>
                    <Wallet size={16} color={COLORS.primary} />
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    (summary.net || 0) >= 0 ? styles.statValueBlue : styles.statValueRed,
                  ]}
                >
                  {formatCurrency(summary.net || 0)}
                </Text>
              </View>

              {/* Savings Rate */}
              <View style={[styles.statCard, { flex: 1 }]}>
                <View style={styles.statCardHeader}>
                  <Text style={styles.statLabel}>Savings Rate</Text>
                  <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Percent size={16} color={COLORS.purple} />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: COLORS.purple }]}>
                  {summary.savingsRate || 0}%
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Category Spending Ranked Breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Category Spending Breakdown</Text>
            <View style={styles.typeSwitcherSmall}>
              <TouchableOpacity
                onPress={() => setType('Expense')}
                style={[
                  styles.smallTypeBtn,
                  type === 'Expense' && styles.smallTypeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.smallTypeBtnText,
                    type === 'Expense' && styles.smallTypeBtnTextActive,
                  ]}
                >
                  Expenses
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setType('Income')}
                style={[
                  styles.smallTypeBtn,
                  type === 'Income' && styles.smallTypeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.smallTypeBtnText,
                    type === 'Income' && styles.smallTypeBtnTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : byCategory.length === 0 ? (
            <Text style={styles.emptyText}>No category records for this range.</Text>
          ) : (
            <View style={styles.catList}>
              {byCategory.map((c, i) => {
                const pct = Math.round((c.total / maxCatTotal) * 100);
                const shareOfTotal =
                  summary && summary.expenses > 0
                    ? Math.round((c.total / summary.expenses) * 100)
                    : 0;

                return (
                  <View key={i} style={styles.catRow}>
                    <View style={styles.catInfoRow}>
                      <Text style={styles.catName}>{c.categoryName || 'Uncategorized'}</Text>
                      <Text style={styles.catAmount}>{formatCurrency(c.total)}</Text>
                    </View>
                    <View style={styles.catProgressTrack}>
                      <View
                        style={[
                          styles.catProgressFill,
                          {
                            width: `${pct}%`,
                            backgroundColor:
                              type === 'Expense' ? COLORS.danger : COLORS.success,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.catShareText}>
                      {c.count} transactions · {shareOfTotal}% of total
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 6-Month Monthly Trend */}
        {trend.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>6-Month Monthly Trend</Text>
            <View style={styles.trendList}>
              {trend.map((m, idx) => (
                <View key={idx} style={styles.trendRow}>
                  <Text style={styles.trendMonth}>{m.month || m._id}</Text>
                  <View style={styles.trendBarsCol}>
                    <View style={styles.trendBarRow}>
                      <Text style={styles.trendBarLabel}>In: {formatCurrency(m.income || 0)}</Text>
                    </View>
                    <View style={styles.trendBarRow}>
                      <Text style={[styles.trendBarLabel, { color: COLORS.danger }]}>
                        Out: {formatCurrency(m.expenses || 0)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.trendNet,
                      (m.net || 0) >= 0 ? styles.statValueBlue : styles.statValueRed,
                    ]}
                  >
                    {(m.net || 0) >= 0 ? '+' : ''}
                    {formatCurrency(m.net || 0)}
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    ...SHADOWS.sm,
  },
  exportBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  filterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  filterCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 10,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  colHalf: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: COLORS.textMain,
  },
  accountFilterSection: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surfaceAlt,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.textMain,
    paddingVertical: 9,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    gap: 10,
    marginBottom: 14,
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
  statCardHeader: {
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
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statValueBlue: {
    color: COLORS.primary,
  },
  statValueRed: {
    color: COLORS.danger,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  typeSwitcherSmall: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    padding: 2,
  },
  smallTypeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  smallTypeBtnActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  smallTypeBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  smallTypeBtnTextActive: {
    color: COLORS.textMain,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  catList: {
    gap: 10,
  },
  catRow: {
    gap: 4,
  },
  catInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  catProgressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  catShareText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  trendList: {
    marginTop: 10,
    gap: 10,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trendMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    width: 60,
  },
  trendBarsCol: {
    flex: 1,
    marginHorizontal: 8,
  },
  trendBarRow: {
    marginBottom: 2,
  },
  trendBarLabel: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },
  trendNet: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ReportsScreen;
