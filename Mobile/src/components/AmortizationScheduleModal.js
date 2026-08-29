import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import loanService from '../services/loanService';
import { X, Calendar, Table } from 'lucide-react-native';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const AmortizationScheduleModal = ({ isOpen, onClose, loan }) => {
  const [schedule, setSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loan && isOpen) {
      setIsLoading(true);
      setError('');
      loanService
        .getLoanSchedule(loan._id)
        .then((data) => setSchedule(data.schedule || []))
        .catch((err) =>
          setError(err.message || 'Failed to load amortization schedule')
        )
        .finally(() => setIsLoading(false));
    }
  }, [loan, isOpen]);

  if (!isOpen || !loan) return null;

  const totalInterest = schedule.reduce((sum, s) => sum + s.interest, 0);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Table size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>Amortization Schedule</Text>
                <Text style={styles.subtitle}>{loan.name}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Loan Overview Banner */}
          <View style={styles.overviewBanner}>
            <View style={styles.overviewCol}>
              <Text style={styles.overviewLabel}>Principal</Text>
              <Text style={styles.overviewValue}>
                {formatCurrency(loan.principal)}
              </Text>
            </View>
            <View style={styles.overviewCol}>
              <Text style={styles.overviewLabel}>Monthly EMI</Text>
              <Text style={[styles.overviewValue, { color: COLORS.primary }]}>
                {formatCurrency(loan.emiAmount)}
              </Text>
            </View>
            <View style={styles.overviewCol}>
              <Text style={styles.overviewLabel}>Total Interest</Text>
              <Text style={[styles.overviewValue, { color: COLORS.danger }]}>
                {formatCurrency(totalInterest)}
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Generating schedule...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.tableCard}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, { width: 32 }]}>#</Text>
                  <Text style={[styles.thCell, { flex: 1 }]}>Due Date</Text>
                  <Text style={[styles.thCell, { width: 75, textAlign: 'right' }]}>
                    Principal
                  </Text>
                  <Text style={[styles.thCell, { width: 70, textAlign: 'right' }]}>
                    Interest
                  </Text>
                  <Text style={[styles.thCell, { width: 85, textAlign: 'right' }]}>
                    Balance
                  </Text>
                </View>

                {/* Table Rows */}
                {schedule.map((row, idx) => {
                  const isLast = idx === schedule.length - 1;
                  return (
                    <View
                      key={row.installment}
                      style={[
                        styles.tableRow,
                        !isLast && styles.rowBorder,
                        idx % 2 === 1 && styles.rowAlt,
                      ]}
                    >
                      <Text style={[styles.tdCell, styles.tdIdx]}>
                        {row.installment}
                      </Text>
                      <Text style={[styles.tdCell, { flex: 1 }]}>
                        {formatDate(row.dueDate)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tdPrincipal]}>
                        {formatCurrency(row.principal)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tdInterest]}>
                        {formatCurrency(row.interest)}
                      </Text>
                      <Text style={[styles.tdCell, styles.tdBalance]}>
                        {formatCurrency(row.balance)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '92%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  overviewBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  overviewCol: {
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  overviewValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  errorBox: {
    padding: 12,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 8,
    marginVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.dangerText,
  },
  scrollArea: {
    maxHeight: 460,
  },
  tableCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tdCell: {
    fontSize: 11,
    color: COLORS.textMain,
  },
  tdIdx: {
    width: 32,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tdPrincipal: {
    width: 75,
    textAlign: 'right',
    color: COLORS.success,
    fontWeight: '600',
  },
  tdInterest: {
    width: 70,
    textAlign: 'right',
    color: COLORS.danger,
    fontWeight: '600',
  },
  tdBalance: {
    width: 85,
    textAlign: 'right',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 10,
  },
  closeModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default AmortizationScheduleModal;
