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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchHealthScore,
  fetchSpendingInsights,
  fetchMonthlyReview,
  fetchCashflowForecast,
  fetchLongtermProjection,
} from '../store/intelligenceSlice';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Activity,
  Zap,
  BarChart2,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  PieChart,
  Store,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Calculator,
  CheckCircle,
  Clock,
  SlidersHorizontal,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react-native';

const TABS = [
  { id: 'health', label: 'Health Score', icon: Activity },
  { id: 'insights', label: 'Spending Insights', icon: BarChart2 },
  { id: 'forecast', label: 'Forecasting & What-If', icon: TrendingUp },
  { id: 'review', label: 'Monthly Review', icon: FileText },
];

const IntelligenceScreen = () => {
  const dispatch = useDispatch();
  const {
    healthScore,
    spendingInsights,
    monthlyReview,
    cashflowForecast,
    longtermProjection,
    isLoading,
    isLoadingInsights,
    isLoadingForecast,
    isLoadingProjection,
  } = useSelector((state) => state.intelligence);

  const [activeTab, setActiveTab] = useState('health');
  const [refreshing, setRefreshing] = useState(false);

  // For Forecasting & What-If
  const [affordInput, setAffordInput] = useState('');
  const [salaryGrowth, setSalaryGrowth] = useState(10);
  const [investReturn, setInvestReturn] = useState(12);
  const [inflation, setInflation] = useState(6);

  // For Monthly Review
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  );
  const [selectedYear, setSelectedYear] = useState(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  );

  const loadTabData = useCallback(async () => {
    if (activeTab === 'health') {
      await dispatch(fetchHealthScore());
    } else if (activeTab === 'insights') {
      await dispatch(fetchSpendingInsights());
    } else if (activeTab === 'forecast') {
      await Promise.all([
        dispatch(fetchCashflowForecast()),
        dispatch(
          fetchLongtermProjection({
            salaryGrowthRate: salaryGrowth,
            investmentReturnRate: investReturn,
            inflationRate: inflation,
          })
        ),
      ]);
    } else if (activeTab === 'review') {
      await dispatch(
        fetchMonthlyReview({
          month: selectedMonth,
          year: selectedYear,
        })
      );
    }
  }, [
    dispatch,
    activeTab,
    selectedMonth,
    selectedYear,
    salaryGrowth,
    investReturn,
    inflation,
  ]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTabData();
    setRefreshing(false);
  }, [loadTabData]);

  // Affordability Simulation Action
  const handleCheckAffordability = () => {
    const amt = parseFloat(affordInput);
    if (!isNaN(amt) && amt > 0) {
      dispatch(fetchCashflowForecast(amt));
    } else {
      dispatch(fetchCashflowForecast());
    }
  };

  const handleRecalculateProjections = () => {
    dispatch(
      fetchLongtermProjection({
        salaryGrowthRate: salaryGrowth,
        investmentReturnRate: investReturn,
        inflationRate: inflation,
      })
    );
  };

  // Month navigation for monthly review
  const prevReviewMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const nextReviewMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // ─────────────────────────────────────────────
  // 1. HEALTH SCORE TAB
  // ─────────────────────────────────────────────
  const renderHealthScore = () => {
    if (isLoading && !healthScore) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Evaluating financial health...</Text>
        </View>
      );
    }

    if (!healthScore) {
      return (
        <View style={styles.emptyBox}>
          <Activity size={32} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No financial data available yet.</Text>
        </View>
      );
    }

    const { score, pillars, metrics } = healthScore;

    let scoreColor = COLORS.success;
    let scoreBg = COLORS.successBg;
    let statusText = 'Excellent';
    let statusDesc = 'Your finances are well balanced and healthy!';

    if (score < 50) {
      scoreColor = COLORS.danger;
      scoreBg = COLORS.dangerBg;
      statusText = 'Needs Attention';
      statusDesc = 'Critical areas like debt or low savings require optimization.';
    } else if (score < 80) {
      scoreColor = '#D97706';
      scoreBg = '#FEF3C7';
      statusText = 'Good / Fair';
      statusDesc = 'Solid foundation, but there is room for further savings.';
    }

    const pillarIcons = {
      savings: TrendingUp,
      debt: AlertTriangle,
      cash: ShieldCheck,
      budget: PieChart,
    };

    return (
      <View style={styles.tabContent}>
        {/* Score Gauge Card */}
        <View style={styles.gaugeCard}>
          <Text style={styles.gaugeHeader}>FINANCIAL HEALTH SCORE</Text>

          <View style={[styles.scoreBadgeCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {score}
            </Text>
            <Text style={styles.scoreMax}>/ 100</Text>
          </View>

          <View style={[styles.statusTag, { backgroundColor: scoreBg }]}>
            <Text style={[styles.statusTagText, { color: scoreColor }]}>
              {statusText}
            </Text>
          </View>

          <Text style={styles.statusDescText}>{statusDesc}</Text>
        </View>

        {/* 4 Pillars Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Core Pillars of Financial Health</Text>

          {pillars &&
            Object.entries(pillars).map(([key, p]) => {
              const IconComp = pillarIcons[key] || Activity;
              const pct = Math.min(100, Math.round((p.score / p.max) * 100));

              return (
                <View key={key} style={styles.pillarItem}>
                  <View style={styles.pillarHeader}>
                    <View style={styles.pillarLeft}>
                      <View style={styles.pillarIconBox}>
                        <IconComp size={15} color={COLORS.primary} />
                      </View>
                      <Text style={styles.pillarName}>{p.label}</Text>
                    </View>

                    <Text style={styles.pillarScoreText}>
                      <Text style={styles.pillarScoreVal}>{p.score}</Text> / {p.max} pts ({p.value})
                    </Text>
                  </View>

                  <View style={styles.pillarTrack}>
                    <View
                      style={[
                        styles.pillarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor:
                            pct >= 75
                              ? COLORS.success
                              : pct >= 45
                              ? '#D97706'
                              : COLORS.danger,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
        </View>

        {/* Key Metrics Grid */}
        {metrics && (
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Liquid Cash</Text>
              <Text style={[styles.metricVal, { color: COLORS.success }]}>
                {formatCurrency(metrics.liquidCash)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Debt</Text>
              <Text style={[styles.metricVal, { color: COLORS.danger }]}>
                {formatCurrency(metrics.totalDebtRemaining)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg. Monthly Income</Text>
              <Text style={styles.metricVal}>
                {formatCurrency(metrics.monthlyIncome)}
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg. Monthly Expense</Text>
              <Text style={styles.metricVal}>
                {formatCurrency(metrics.monthlyExpense)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────
  // 2. SPENDING INSIGHTS TAB
  // ─────────────────────────────────────────────
  const renderSpendingInsights = () => {
    if (isLoadingInsights && !spendingInsights) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Analyzing spending patterns...</Text>
        </View>
      );
    }

    if (!spendingInsights) {
      return (
        <View style={styles.emptyBox}>
          <BarChart2 size={32} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No transaction insights found.</Text>
        </View>
      );
    }

    const {
      dayOfWeekBreakdown,
      topMerchants,
      categoryTrends,
      anomalousTransactions,
      subscriptionCandidates,
      insights,
    } = spendingInsights;

    const maxDaySpend = Math.max(
      ...(dayOfWeekBreakdown || []).map((d) => d.total),
      1
    );

    return (
      <View style={styles.tabContent}>
        {/* Behavioral Observations */}
        {insights && insights.length > 0 && (
          <View style={styles.obsBanner}>
            <View style={styles.obsHeader}>
              <Zap size={16} color="#F59E0B" />
              <Text style={styles.obsTitle}>Behavioral Observations</Text>
            </View>
            <View style={styles.obsList}>
              {insights.map((ins, idx) => (
                <View key={idx} style={styles.obsItem}>
                  <Text style={styles.obsBullet}>•</Text>
                  <Text style={styles.obsText}>
                    {ins.text.replace(/\*\*/g, '')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Anomalies Detected Card */}
        {anomalousTransactions && anomalousTransactions.length > 0 && (
          <View style={[styles.card, styles.anomalyCard]}>
            <View style={styles.anomalyHeaderRow}>
              <AlertTriangle size={17} color={COLORS.danger} />
              <Text style={styles.anomalyTitle}>
                Anomalies & Spending Spikes ({anomalousTransactions.length})
              </Text>
            </View>
            <Text style={styles.anomalySubtitle}>
              Transactions significantly exceeding your normal averages.
            </Text>

            <View style={styles.anomalyList}>
              {anomalousTransactions.map((anom) => (
                <View key={anom.id} style={styles.anomalyItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anomalyMerchant}>{anom.merchant}</Text>
                    <Text style={styles.anomalyMeta}>
                      {anom.category} · {anom.ratio}x average spend
                    </Text>
                  </View>
                  <Text style={styles.anomalyAmount}>
                    {formatCurrency(anom.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Day of Week Spending */}
        {dayOfWeekBreakdown && dayOfWeekBreakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Spending by Day of Week</Text>
            <View style={styles.dowBarsRow}>
              {dayOfWeekBreakdown.map((d) => {
                const heightPct = Math.max(
                  8,
                  Math.round((d.total / maxDaySpend) * 100)
                );
                return (
                  <View key={d.day} style={styles.dowBarCol}>
                    <Text style={styles.dowSpendText}>
                      {d.total > 0 ? `₹${Math.round(d.total / 1000)}k` : '—'}
                    </Text>
                    <View style={styles.dowBarTrack}>
                      <View
                        style={[
                          styles.dowBarFill,
                          {
                            height: `${heightPct}%`,
                            backgroundColor:
                              d.day === 'Sat' || d.day === 'Sun'
                                ? '#8B5CF6'
                                : COLORS.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.dowDayLabel}>{d.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Top Merchants */}
        {topMerchants && topMerchants.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Store size={16} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Top Merchants</Text>
            </View>

            <View style={styles.merchantList}>
              {topMerchants.map((m, idx) => (
                <View key={m.name} style={styles.merchantRow}>
                  <Text style={styles.merchantIdx}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.merchantName}>{m.name}</Text>
                    <Text style={styles.merchantSub}>
                      {m.count} {m.count === 1 ? 'transaction' : 'transactions'} · avg {formatCurrency(m.avg)}
                    </Text>
                  </View>
                  <Text style={styles.merchantTotal}>
                    {formatCurrency(m.total)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category MoM Trends */}
        {categoryTrends && categoryTrends.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Category Shifts (vs Prev Month)</Text>
            <View style={styles.trendList}>
              {categoryTrends.map((c) => {
                const changeNum = parseFloat(c.changePct);
                const hasIncreased = changeNum > 0;

                return (
                  <View key={c.id || c.name} style={styles.trendRow}>
                    <View
                      style={[
                        styles.catColorDot,
                        { backgroundColor: c.color || COLORS.primary },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trendCatName}>{c.name}</Text>
                      <Text style={styles.trendCatPrev}>
                        Prev: {formatCurrency(c.previous)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.trendCatCurr}>
                        {formatCurrency(c.current)}
                      </Text>
                      {c.changePct !== null && (
                        <Text
                          style={[
                            styles.trendChangeBadge,
                            hasIncreased ? styles.textRed : styles.textGreen,
                          ]}
                        >
                          {hasIncreased ? '▲ +' : '▼ '}
                          {Math.abs(changeNum)}%
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Subscription Candidates */}
        {subscriptionCandidates && subscriptionCandidates.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detected Subscriptions</Text>
            <View style={styles.subsList}>
              {subscriptionCandidates.map((sub, i) => (
                <View key={i} style={styles.subsItem}>
                  <View>
                    <Text style={styles.subsName}>{sub.merchant}</Text>
                    <Text style={styles.subsMeta}>
                      Billed ~{formatCurrency(sub.amount)} · {sub.frequency || 'Monthly candidate'}
                    </Text>
                  </View>
                  <Text style={styles.subsAmount}>{formatCurrency(sub.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────
  // 3. FORECASTING & WHAT-IF TAB
  // ─────────────────────────────────────────────
  const renderForecasting = () => {
    const hasRisk =
      cashflowForecast?.riskMonths && cashflowForecast.riskMonths.length > 0;
    const afford = cashflowForecast?.affordability;

    return (
      <View style={styles.tabContent}>
        {/* Section 1: 90-Day Cash Flow Forecast */}
        <View style={styles.sectionHeaderBox}>
          <Calendar size={18} color={COLORS.primary} />
          <Text style={styles.sectionHeading}>90-Day Cash Flow Forecast</Text>
        </View>

        {/* Risk / Health Banner */}
        {hasRisk ? (
          <View style={styles.riskAlertBanner}>
            <AlertTriangle size={18} color={COLORS.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.riskAlertTitle}>Projected Cash Shortfall</Text>
              <Text style={styles.riskAlertText}>
                Your projected balance may go negative in{' '}
                {cashflowForecast.riskMonths.map((m) => m.label).join(', ')}.
                Consider cutting discretionary spending.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.safeAlertBanner}>
            <CheckCircle size={18} color={COLORS.success} />
            <Text style={styles.safeAlertText}>
              Positive cash balance projected for the next 90 days!
            </Text>
          </View>
        )}

        {/* Starting Balance & 3-Month Projection Cards */}
        {cashflowForecast?.monthlyProjections && (
          <View style={styles.forecastMonthGrid}>
            {cashflowForecast.monthlyProjections.map((m) => {
              const isNegative = m.projectedEndBalance < 0;
              return (
                <View
                  key={m.label}
                  style={[
                    styles.forecastMonthCard,
                    isNegative && styles.monthCardNegative,
                  ]}
                >
                  <Text style={styles.monthCardTitle}>{m.label}</Text>
                  <View style={styles.monthRow}>
                    <Text style={styles.monthSubLabel}>Income</Text>
                    <Text style={styles.monthIncomeVal}>
                      +{formatCurrency(m.income)}
                    </Text>
                  </View>
                  <View style={styles.monthRow}>
                    <Text style={styles.monthSubLabel}>Expense</Text>
                    <Text style={styles.monthExpenseVal}>
                      -{formatCurrency(m.expense)}
                    </Text>
                  </View>
                  <View style={[styles.monthRow, styles.monthEndRow]}>
                    <Text style={styles.monthEndLabel}>End Balance</Text>
                    <Text
                      style={[
                        styles.monthEndVal,
                        isNegative ? styles.textRed : styles.textPrimary,
                      ]}
                    >
                      {formatCurrency(m.projectedEndBalance)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Section 2: What-If / "Can I Afford This?" Calculator */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Calculator size={18} color="#6366F1" />
            <Text style={styles.cardTitle}>"Can I Afford This?" Calculator</Text>
          </View>
          <Text style={styles.cardSub}>
            Simulate a large upcoming expense to test 90-day cash flow safety.
          </Text>

          <View style={styles.affordInputRow}>
            <TextInput
              style={styles.affordInput}
              keyboardType="numeric"
              placeholder="Expense amount (e.g. 50000)"
              placeholderTextColor={COLORS.textLight}
              value={affordInput}
              onChangeText={setAffordInput}
            />
            <TouchableOpacity
              style={styles.affordBtn}
              onPress={handleCheckAffordability}
              disabled={isLoadingForecast}
            >
              <Text style={styles.affordBtnText}>Simulate</Text>
            </TouchableOpacity>
          </View>

          {/* Affordability Verdict */}
          {afford && (
            <View
              style={[
                styles.verdictBox,
                afford.canAfford ? styles.verdictSafe : styles.verdictDanger,
              ]}
            >
              <View style={styles.verdictHeader}>
                {afford.canAfford ? (
                  <CheckCircle size={18} color={COLORS.success} />
                ) : (
                  <AlertTriangle size={18} color={COLORS.danger} />
                )}
                <Text
                  style={[
                    styles.verdictTitle,
                    afford.canAfford ? styles.textGreen : styles.textRed,
                  ]}
                >
                  {afford.canAfford
                    ? 'Yes! You can comfortably afford it.'
                    : 'Warning: High Cash Risk!'}
                </Text>
              </View>

              <Text style={styles.verdictDesc}>
                {afford.canAfford
                  ? `Your balance stays positive throughout the 90 days. Lowest point reaches ${formatCurrency(
                      afford.lowestProjectedBalance
                    )}.`
                  : 'Your bank balance will dip below zero. You may need to borrow or liquidate investments.'}
              </Text>

              {afford.recoveryDate && !afford.canAfford && (
                <View style={styles.recoveryRow}>
                  <Clock size={13} color="#D97706" />
                  <Text style={styles.recoveryText}>
                    Cash balance recovers by{' '}
                    {new Date(afford.recoveryDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 3: 5-Year Long-Term Net Worth Projection */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <TrendingUp size={18} color="#0D9488" />
            <Text style={styles.cardTitle}>5-Year Wealth Projections</Text>
          </View>

          {/* Stepper Inputs for Assumptions */}
          <View style={styles.stepperSection}>
            {/* Salary Growth */}
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Salary Growth (% p.a.)</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setSalaryGrowth((v) => Math.max(0, v - 1))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{salaryGrowth}%</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setSalaryGrowth((v) => Math.min(30, v + 1))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Investment Return */}
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Investment Return (% p.a.)</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setInvestReturn((v) => Math.max(0, v - 1))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{investReturn}%</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setInvestReturn((v) => Math.min(30, v + 1))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Inflation */}
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Inflation Rate (% p.a.)</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setInflation((v) => Math.max(0, v - 1))}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepValue}>{inflation}%</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => setInflation((v) => Math.min(20, v + 1))}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.recalcBtn}
              onPress={handleRecalculateProjections}
              disabled={isLoadingProjection}
            >
              <Text style={styles.recalcBtnText}>Apply & Project</Text>
            </TouchableOpacity>
          </View>

          {/* 5-Year Year-by-Year Table / List */}
          {longtermProjection?.projections && (
            <View style={styles.ltProjectionsList}>
              <Text style={styles.ltTitle}>Year-by-Year Forecast</Text>
              {longtermProjection.projections.map((p, idx) => (
                <View key={p.year || idx} style={styles.ltRow}>
                  <View>
                    <Text style={styles.ltYearLabel}>{p.label || `Year ${idx + 1}`}</Text>
                    <Text style={styles.ltSubText}>
                      Assets: {formatCurrency(p.assets)} · Debt: {formatCurrency(p.liabilities)}
                    </Text>
                  </View>
                  <Text style={styles.ltNetWorth}>
                    {formatCurrency(p.netWorth)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────
  // 4. MONTHLY REVIEW TAB
  // ─────────────────────────────────────────────
  const renderMonthlyReview = () => {
    if (isLoading && !monthlyReview) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating monthly review...</Text>
        </View>
      );
    }

    const monthLabel = new Date(selectedYear, selectedMonth, 1).toLocaleString(
      'default',
      {
        month: 'long',
        year: 'numeric',
      }
    );

    const summary = monthlyReview?.summary;
    const topCats = monthlyReview?.topCategories || [];
    const largestTxns = monthlyReview?.largestTransactions || [];
    const insights = monthlyReview?.insights || [];

    const netSaved = summary?.netCashFlow || 0;
    const isPositiveCashflow = netSaved >= 0;

    return (
      <View style={styles.tabContent}>
        {/* Month Selector */}
        <View style={styles.reviewNavRow}>
          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={prevReviewMonth}
          >
            <ChevronLeft size={20} color={COLORS.textMain} />
          </TouchableOpacity>

          <Text style={styles.reviewMonthTitle}>{monthLabel}</Text>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={nextReviewMonth}
          >
            <ChevronRight size={20} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        {/* Cash Flow Summary */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>NET CASH FLOW</Text>
          <Text
            style={[
              styles.heroAmount,
              isPositiveCashflow ? styles.heroPositive : styles.heroNegative,
            ]}
          >
            {isPositiveCashflow ? '+' : ''}
            {formatCurrency(netSaved)}
          </Text>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatLabel}>Total Earned</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(summary?.totalIncome || 0)}
              </Text>
            </View>
            <View style={[styles.heroStatCol, styles.heroStatBorder]}>
              <Text style={styles.heroStatLabel}>Total Spent</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(summary?.totalExpense || 0)}
              </Text>
            </View>
            <View style={[styles.heroStatCol, styles.heroStatBorder]}>
              <Text style={styles.heroStatLabel}>Savings Rate</Text>
              <Text style={[styles.heroStatValue, { color: '#34D399' }]}>
                {summary?.savingsRate || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Automated Takeaways / Insights */}
        {insights.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Sparkles size={16} color="#F59E0B" />
              <Text style={styles.cardTitle}>Month Takeaways & AI Analysis</Text>
            </View>
            <View style={styles.obsList}>
              {insights.map((ins, i) => (
                <View key={i} style={styles.obsItem}>
                  <Text style={styles.obsBullet}>•</Text>
                  <Text style={styles.obsText}>{ins.replace(/\*\*/g, '')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Expense Categories */}
        {topCats.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Expense Areas</Text>
            <View style={styles.trendList}>
              {topCats.map((c) => (
                <View key={c.name} style={styles.trendRow}>
                  <View
                    style={[
                      styles.catColorDot,
                      { backgroundColor: c.color || COLORS.primary },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trendCatName}>{c.name}</Text>
                    <Text style={styles.trendCatPrev}>{c.percentage}% of total spend</Text>
                  </View>
                  <Text style={styles.trendCatCurr}>{formatCurrency(c.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top 5 Largest Transactions */}
        {largestTxns.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Largest Transactions</Text>
            <View style={styles.txList}>
              {largestTxns.map((t) => (
                <View key={t._id} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txMerchant}>
                      {t.merchant || t.description || 'Expense'}
                    </Text>
                    <Text style={styles.txMeta}>
                      {new Date(t.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.txAmount}>{formatCurrency(t.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.tabsHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const IconComp = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <IconComp
                  size={15}
                  color={isSelected ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    isSelected && styles.tabBtnTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
        {activeTab === 'health' && renderHealthScore()}
        {activeTab === 'insights' && renderSpendingInsights()}
        {activeTab === 'forecast' && renderForecasting()}
        {activeTab === 'review' && renderMonthlyReview()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabsHeader: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  tabsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 14,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  gaugeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  gaugeHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  scoreBadgeCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statusTag: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusTagText: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusDescText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  pillarItem: {
    marginBottom: 12,
  },
  pillarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  pillarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillarIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  pillarScoreText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  pillarScoreVal: {
    fontWeight: '700',
    color: COLORS.textMain,
  },
  pillarTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pillarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 3,
  },
  obsBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  obsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  obsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  obsList: {
    gap: 6,
  },
  obsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  obsBullet: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  obsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  anomalyCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  anomalyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anomalyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
  anomalySubtitle: {
    fontSize: 11,
    color: COLORS.dangerText,
    marginTop: 2,
    marginBottom: 10,
  },
  anomalyList: {
    gap: 8,
  },
  anomalyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
  },
  anomalyMerchant: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  anomalyMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  anomalyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
  dowBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 6,
    paddingTop: 10,
  },
  dowBarCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  dowSpendText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  dowBarTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  dowBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  dowDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  merchantList: {
    gap: 8,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  merchantIdx: {
    width: 20,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  merchantSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  merchantTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  trendList: {
    gap: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  trendCatName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  trendCatPrev: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  trendCatCurr: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  trendChangeBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  subsList: {
    gap: 8,
  },
  subsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subsName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  subsMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  subsAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Forecasting Styles
  sectionHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  riskAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  riskAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.danger,
  },
  riskAlertText: {
    fontSize: 12,
    color: COLORS.dangerText,
    marginTop: 2,
    lineHeight: 16,
  },
  safeAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
  },
  safeAlertText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
  },
  forecastMonthGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastMonthCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  monthCardNegative: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  monthCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  monthSubLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  monthIncomeVal: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
  },
  monthExpenseVal: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
  },
  monthEndRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 4,
    marginTop: 2,
  },
  monthEndLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  monthEndVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  affordInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  affordInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain,
  },
  affordBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affordBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  verdictBox: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  verdictSafe: {
    backgroundColor: COLORS.successBg,
    borderColor: '#A7F3D0',
  },
  verdictDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  verdictTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  verdictDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  recoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  recoveryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  stepperSection: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  stepValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    minWidth: 38,
    textAlign: 'center',
  },
  recalcBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  recalcBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ltProjectionsList: {
    gap: 6,
  },
  ltTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  ltRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  ltYearLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  ltSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  ltNetWorth: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  // Monthly Review Styles
  reviewNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.md,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  heroPositive: {
    color: '#34D399',
  },
  heroNegative: {
    color: '#F87171',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
  },
  heroStatCol: {
    flex: 1,
  },
  heroStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    paddingLeft: 10,
  },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  txList: {
    gap: 8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txMerchant: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  txMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  textGreen: {
    color: COLORS.success,
  },
  textRed: {
    color: COLORS.danger,
  },
  textPrimary: {
    color: COLORS.primary,
  },
});

export default IntelligenceScreen;
