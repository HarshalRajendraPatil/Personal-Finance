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
  fetchInvestments,
  deleteInvestment,
} from '../store/investmentSlice';
import InvestmentFormModal, {
  TYPE_COLORS,
} from '../components/InvestmentFormModal';
import UpdateValueModal from '../components/UpdateValueModal';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Coins,
  RefreshCw,
  PieChart,
} from 'lucide-react-native';

const InvestmentsScreen = () => {
  const dispatch = useDispatch();
  const { investments, isLoading, error } = useSelector(
    (state) => state.investments
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [updatingInvestment, setUpdatingInvestment] = useState(null);
  const [selectedType, setSelectedType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchInvestments());
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchInvestments());
    setRefreshing(false);
  }, [dispatch]);

  const handleAddNew = () => {
    setEditingInvestment(null);
    setIsFormOpen(true);
  };

  const handleEdit = (inv) => {
    setEditingInvestment(inv);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Investment',
      'Are you sure you want to delete this investment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteInvestment(id)),
        },
      ]
    );
  };

  // Calculations
  const totalInvested = investments.reduce(
    (sum, i) => sum + (i.investedAmount || 0),
    0
  );
  const totalCurrentValue = investments.reduce(
    (sum, i) => sum + (i.currentValue || 0),
    0
  );
  const totalPl = totalCurrentValue - totalInvested;
  const overallReturnPct =
    totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0;
  const isOverallProfit = totalPl >= 0;

  const filteredInvestments = investments.filter((i) => {
    if (selectedType === 'All') return true;
    return i.type === selectedType;
  });

  // Extract unique types for filter pills
  const availableTypes = ['All', ...new Set(investments.map((i) => i.type))];

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
            <Text style={styles.screenTitle}>Investments</Text>
            <Text style={styles.screenSubtitle}>
              Stocks, Mutual Funds, Gold, Crypto & more.
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={handleAddNew}>
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Portfolio Summary Stats */}
        <View style={styles.statsGrid}>
          {/* Current Portfolio Value */}
          <View style={styles.statCard}>
            <View style={styles.statCardContent}>
              <View>
                <Text style={styles.statLabel}>Portfolio Value</Text>
                <Text style={styles.portfolioAmount}>
                  {formatCurrency(totalCurrentValue)}
                </Text>
              </View>
              <View
                style={[
                  styles.statIconBox,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Coins size={20} color={COLORS.primary} />
              </View>
            </View>
          </View>

          {/* Invested & Total Return row */}
          <View style={styles.statSubRow}>
            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel}>Total Invested</Text>
              <Text style={styles.statSubValue}>
                {formatCurrency(totalInvested)}
              </Text>
            </View>

            <View style={[styles.statCard, styles.statCardHalf]}>
              <Text style={styles.statLabel}>Total P&L</Text>
              <View style={styles.plRow}>
                <Text
                  style={[
                    styles.statSubValue,
                    isOverallProfit ? styles.textGreen : styles.textRed,
                  ]}
                >
                  {isOverallProfit ? '+' : ''}
                  {overallReturnPct.toFixed(2)}%
                </Text>
                {isOverallProfit ? (
                  <TrendingUp size={16} color={COLORS.success} />
                ) : (
                  <TrendingDown size={16} color={COLORS.danger} />
                )}
              </View>
              <Text
                style={[
                  styles.plSubText,
                  isOverallProfit ? styles.textGreen : styles.textRed,
                ]}
              >
                {isOverallProfit ? '+' : ''}
                {formatCurrency(totalPl)}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        {investments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            {availableTypes.map((t) => {
              const isSelected = selectedType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedType(t)}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* List of Investments */}
        {isLoading && investments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading portfolio...</Text>
          </View>
        ) : filteredInvestments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Coins size={32} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No investments found</Text>
            <Text style={styles.emptySubtitle}>
              Track stocks, mutual funds, gold, crypto, and fixed deposits.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddNew}>
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.emptyAddBtnText}>Add Asset</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsCol}>
            {filteredInvestments.map((inv) => {
              const typeColor = TYPE_COLORS[inv.type] || COLORS.primary;
              const invested = inv.investedAmount || 0;
              const current = inv.currentValue || 0;
              const pl = current - invested;
              const retPct = invested > 0 ? (pl / invested) * 100 : 0;
              const isProfit = pl >= 0;

              return (
                <View key={inv._id} style={styles.invCard}>
                  {/* Top Row */}
                  <View style={styles.invCardHeader}>
                    <View style={styles.invTitleRow}>
                      <View
                        style={[
                          styles.typeTag,
                          { backgroundColor: `${typeColor}15` },
                        ]}
                      >
                        <Text style={[styles.typeTagText, { color: typeColor }]}>
                          {inv.type}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invName} numberOfLines={1}>
                          {inv.name}
                        </Text>
                        {inv.platform ? (
                          <Text style={styles.platformText}>{inv.platform}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.headerActions}>
                      <TouchableOpacity
                        onPress={() => handleEdit(inv)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Edit2 size={15} color={COLORS.textLight} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(inv._id)}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Values Row */}
                  <View style={styles.invValuesRow}>
                    <View>
                      <Text style={styles.invValLabel}>Current Value</Text>
                      <Text style={styles.invCurrentVal}>
                        {formatCurrency(current)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.invValLabel}>Invested</Text>
                      <Text style={styles.invInvestedVal}>
                        {formatCurrency(invested)}
                      </Text>
                    </View>
                  </View>

                  {/* Return Badge & Units */}
                  <View style={styles.invMetaRow}>
                    <View
                      style={[
                        styles.plBadge,
                        isProfit ? styles.plBadgeGreen : styles.plBadgeRed,
                      ]}
                    >
                      {isProfit ? (
                        <TrendingUp size={12} color={COLORS.successText} />
                      ) : (
                        <TrendingDown size={12} color={COLORS.dangerText} />
                      )}
                      <Text
                        style={[
                          styles.plBadgeText,
                          isProfit ? styles.textGreen : styles.textRed,
                        ]}
                      >
                        {isProfit ? '+' : ''}
                        {retPct.toFixed(2)}% ({formatCurrency(pl)})
                      </Text>
                    </View>

                    {inv.quantity ? (
                      <Text style={styles.unitsText}>
                        {inv.quantity} units {inv.buyPrice ? `@ ₹${inv.buyPrice}` : ''}
                      </Text>
                    ) : null}
                  </View>

                  {/* Action Footer */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.updateValBtn}
                      onPress={() => setUpdatingInvestment(inv)}
                    >
                      <RefreshCw size={13} color={COLORS.primary} />
                      <Text style={styles.updateValBtnText}>Update Value</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Form Modal */}
      <InvestmentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        investment={editingInvestment}
      />

      {/* Update Value Modal */}
      <UpdateValueModal
        isOpen={!!updatingInvestment}
        onClose={() => setUpdatingInvestment(null)}
        investment={updatingInvestment}
      />
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statSubRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCardHalf: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  portfolioAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textMain,
    marginTop: 4,
  },
  statSubValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  plRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plSubText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.surface,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.dangerText,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardsCol: {
    gap: 12,
  },
  invCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  invCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  invTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  invName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  platformText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    padding: 2,
  },
  invValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  invValLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  invCurrentVal: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 2,
  },
  invInvestedVal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  invMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  plBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  plBadgeGreen: {
    backgroundColor: COLORS.successBg,
  },
  plBadgeRed: {
    backgroundColor: COLORS.dangerBg,
  },
  plBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  unitsText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  updateValBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  updateValBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  textGreen: {
    color: COLORS.success,
  },
  textRed: {
    color: COLORS.danger,
  },
});

export default InvestmentsScreen;
