import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCalendarEvents } from '../store/calendarSlice';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Repeat,
  Landmark,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getLocalDateStr = (d) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const CalendarScreen = () => {
  const dispatch = useDispatch();
  const { events, isLoading, error } = useSelector((state) => state.calendar);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(
    getLocalDateStr(new Date())
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadMonthEvents = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    // Padding of +/- 7 days
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    await dispatch(
      fetchCalendarEvents({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
    );
  }, [dispatch, currentDate]);

  useEffect(() => {
    loadMonthEvents();
  }, [loadMonthEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMonthEvents();
    setRefreshing(false);
  }, [loadMonthEvents]);

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(getLocalDateStr(now));
  };

  // Group events by local date string YYYY-MM-DD
  const eventsByDate = (events || []).reduce((acc, ev) => {
    const dStr = getLocalDateStr(ev.date);
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(ev);
    return acc;
  }, {});

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const days = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = days[0].getDay(); // 0 is Sun

  // Leading padding days from previous month
  const paddingDays = Array.from({ length: firstDayOfMonth }).map((_, i) => {
    const d = new Date(currentYear, currentMonth, 0);
    d.setDate(d.getDate() - (firstDayOfMonth - 1 - i));
    return d;
  });

  const fullGridDays = [...paddingDays, ...days];

  // Month Inflow & Outflow totals for events in this current month
  const monthEvents = (events || []).filter((e) => {
    const ed = new Date(e.date);
    return (
      ed.getFullYear() === currentYear && ed.getMonth() === currentMonth
    );
  });

  const monthInflow = monthEvents
    .filter((e) => e.type === 'Income')
    .reduce((s, e) => s + e.amount, 0);

  const monthOutflow = monthEvents
    .filter((e) => e.type === 'Expense')
    .reduce((s, e) => s + e.amount, 0);

  const selectedDayEvents = eventsByDate[selectedDateStr] || [];

  const todayStr = getLocalDateStr(new Date());

  const getSourceIcon = (source) => {
    switch (source) {
      case 'Recurring':
        return <Repeat size={13} color="#2563EB" />;
      case 'Loan':
        return <Landmark size={13} color="#EA580C" />;
      default:
        return <ArrowRightLeft size={13} color={COLORS.textSecondary} />;
    }
  };

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
            <Text style={styles.screenTitle}>Financial Calendar</Text>
            <Text style={styles.screenSubtitle}>
              Cash flow schedule & upcoming commitments.
            </Text>
          </View>
          <TouchableOpacity style={styles.todayBtn} onPress={jumpToToday}>
            <CalendarIcon size={14} color={COLORS.primary} />
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Month Cash Flow Inflow vs Outflow Banner */}
        <View style={styles.cashflowBanner}>
          <View style={styles.cfCol}>
            <View style={styles.cfLabelRow}>
              <TrendingUp size={13} color={COLORS.success} />
              <Text style={styles.cfLabel}>Expected Inflow</Text>
            </View>
            <Text style={[styles.cfVal, { color: COLORS.success }]}>
              {formatCurrency(monthInflow)}
            </Text>
          </View>

          <View style={styles.cfDivider} />

          <View style={styles.cfCol}>
            <View style={styles.cfLabelRow}>
              <TrendingDown size={13} color={COLORS.danger} />
              <Text style={styles.cfLabel}>Scheduled Outflow</Text>
            </View>
            <Text style={[styles.cfVal, { color: COLORS.danger }]}>
              {formatCurrency(monthOutflow)}
            </Text>
          </View>
        </View>

        {/* Calendar Widget */}
        <View style={styles.calendarCard}>
          {/* Month Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={prevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={20} color={COLORS.textMain} />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>{monthName}</Text>

            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={nextMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={20} color={COLORS.textMain} />
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View style={styles.dowRow}>
            {DAY_NAMES.map((d, i) => (
              <Text
                key={d}
                style={[
                  styles.dowText,
                  (i === 0 || i === 6) && styles.dowWeekend,
                ]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Day Cells Grid */}
          <View style={styles.gridContainer}>
            {fullGridDays.map((dateObj, idx) => {
              const dStr = getLocalDateStr(dateObj);
              const isCurrentMonth = dateObj.getMonth() === currentMonth;
              const isSelected = dStr === selectedDateStr;
              const isToday = dStr === todayStr;
              const dayEvents = eventsByDate[dStr] || [];
              const hasEvents = dayEvents.length > 0;
              const hasScheduled = dayEvents.some((e) => e.isFuture);
              const hasExpense = dayEvents.some((e) => e.type === 'Expense');
              const hasIncome = dayEvents.some((e) => e.type === 'Income');

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setSelectedDateStr(dStr)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !isCurrentMonth && styles.dayNumberMuted,
                      isSelected && styles.dayNumberSelected,
                      isToday && !isSelected && styles.dayNumberToday,
                    ]}
                  >
                    {dateObj.getDate()}
                  </Text>

                  {/* Indicator Dot */}
                  {hasEvents && (
                    <View style={styles.dotsRow}>
                      {hasIncome && <View style={[styles.dot, styles.dotGreen]} />}
                      {hasExpense && <View style={[styles.dot, styles.dotRed]} />}
                      {hasScheduled && (
                        <View style={[styles.dot, styles.dotBlue]} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Events Section */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={styles.eventsDateTitle}>
              {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(
                'en-IN',
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }
              )}
            </Text>
            <Text style={styles.eventsCount}>
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'event' : 'events'}
            </Text>
          </View>

          {selectedDayEvents.length === 0 ? (
            <View style={styles.emptyDayBox}>
              <Clock size={24} color={COLORS.textLight} />
              <Text style={styles.emptyDayText}>
                No transactions or commitments on this date.
              </Text>
            </View>
          ) : (
            <View style={styles.eventList}>
              {selectedDayEvents.map((ev) => {
                const isIncome = ev.type === 'Income';
                return (
                  <View key={ev.id} style={styles.eventItem}>
                    <View style={styles.eventLeft}>
                      <View style={styles.sourceTag}>
                        {getSourceIcon(ev.source)}
                        <Text style={styles.sourceTagText}>{ev.source}</Text>
                      </View>

                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {ev.title}
                      </Text>

                      <View style={styles.eventMetaRow}>
                        {ev.category ? (
                          <Text style={styles.eventCategory}>{ev.category}</Text>
                        ) : null}
                        {ev.account ? (
                          <Text style={styles.eventAccount}>· {ev.account}</Text>
                        ) : null}
                        {ev.status && (
                          <Text
                            style={[
                              styles.eventStatus,
                              ev.isFuture
                                ? styles.statusScheduled
                                : styles.statusDone,
                            ]}
                          >
                            · {ev.status}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.eventAmount,
                        isIncome ? styles.textGreen : styles.textRed,
                      ]}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(ev.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
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
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cashflowBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cfCol: {
    flex: 1,
    alignItems: 'center',
  },
  cfDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  cfLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cfLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  cfVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  calendarCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  dowRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    marginBottom: 6,
  },
  dowText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  dowWeekend: {
    color: '#EF4444',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  dayNumberMuted: {
    color: COLORS.textLight,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumberToday: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    height: 4,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotGreen: {
    backgroundColor: COLORS.success,
  },
  dotRed: {
    backgroundColor: COLORS.danger,
  },
  dotBlue: {
    backgroundColor: '#3B82F6',
  },
  eventsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  eventsDateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  eventsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  emptyDayBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyDayText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  eventList: {
    gap: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventLeft: {
    flex: 1,
    marginRight: 8,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventCategory: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  eventAccount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 3,
  },
  eventStatus: {
    fontSize: 11,
    marginLeft: 3,
  },
  statusScheduled: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  statusDone: {
    color: COLORS.success,
  },
  eventAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  textGreen: {
    color: COLORS.success,
  },
  textRed: {
    color: COLORS.danger,
  },
});

export default CalendarScreen;
