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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTaxRecordByYear,
  updateTaxRecord,
  clearTaxError,
} from '../store/taxSlice';
import { formatCurrency } from '../utils/formatCurrency';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Calculator,
  Save,
  HelpCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ChevronDown,
} from 'lucide-react-native';

const FY_OPTIONS = ['2024-2025', '2023-2024', '2025-2026'];

const TaxesScreen = () => {
  const dispatch = useDispatch();
  const { currentRecord, isLoading, error } = useSelector((state) => state.taxes);

  const [year, setYear] = useState(FY_OPTIONS[0]);
  const [salaryIncome, setSalaryIncome] = useState('');
  const [businessIncome, setBusinessIncome] = useState('');
  const [capitalGains, setCapitalGains] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [standardDeduction, setStandardDeduction] = useState('50000');
  const [tdsPaid, setTdsPaid] = useState('');
  const [advanceTaxPaid, setAdvanceTaxPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSlabs, setShowSlabs] = useState(false);

  const loadTaxData = useCallback(async () => {
    await dispatch(fetchTaxRecordByYear(year));
  }, [dispatch, year]);

  useEffect(() => {
    loadTaxData();
  }, [loadTaxData]);

  useEffect(() => {
    if (currentRecord && currentRecord.financialYear === year) {
      setSalaryIncome(
        currentRecord.salaryIncome ? String(currentRecord.salaryIncome) : ''
      );
      setBusinessIncome(
        currentRecord.businessIncome ? String(currentRecord.businessIncome) : ''
      );
      setCapitalGains(
        currentRecord.capitalGains ? String(currentRecord.capitalGains) : ''
      );
      setOtherIncome(
        currentRecord.otherIncome ? String(currentRecord.otherIncome) : ''
      );
      setStandardDeduction(
        currentRecord.standardDeduction !== undefined
          ? String(currentRecord.standardDeduction)
          : '50000'
      );
      setTdsPaid(currentRecord.tdsPaid ? String(currentRecord.tdsPaid) : '');
      setAdvanceTaxPaid(
        currentRecord.advanceTaxPaid ? String(currentRecord.advanceTaxPaid) : ''
      );
      setNotes(currentRecord.notes || '');
    } else {
      setSalaryIncome('');
      setBusinessIncome('');
      setCapitalGains('');
      setOtherIncome('');
      setStandardDeduction('50000');
      setTdsPaid('');
      setAdvanceTaxPaid('');
      setNotes('');
    }
  }, [currentRecord, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTaxData();
    setRefreshing(false);
  }, [loadTaxData]);

  const handleSave = async () => {
    const payload = {
      salaryIncome: parseFloat(salaryIncome) || 0,
      businessIncome: parseFloat(businessIncome) || 0,
      capitalGains: parseFloat(capitalGains) || 0,
      otherIncome: parseFloat(otherIncome) || 0,
      standardDeduction: parseFloat(standardDeduction) || 0,
      tdsPaid: parseFloat(tdsPaid) || 0,
      advanceTaxPaid: parseFloat(advanceTaxPaid) || 0,
      notes: notes.trim(),
    };

    try {
      await dispatch(updateTaxRecord({ year, data: payload })).unwrap();
      Alert.alert('Success', `Tax estimation for FY ${year} saved successfully!`);
    } catch {
      Alert.alert('Error', 'Failed to save tax record.');
    }
  };

  // Live Calculations
  const grossIncome =
    (parseFloat(salaryIncome) || 0) +
    (parseFloat(businessIncome) || 0) +
    (parseFloat(capitalGains) || 0) +
    (parseFloat(otherIncome) || 0);

  const deductions = parseFloat(standardDeduction) || 0;
  const taxableIncome = Math.max(0, grossIncome - deductions);
  const taxLiability = currentRecord?.calculatedTaxLiability || 0;
  const totalTaxPaid =
    (parseFloat(tdsPaid) || 0) + (parseFloat(advanceTaxPaid) || 0);
  const netDue = taxLiability - totalTaxPaid;
  const isRefund = netDue < 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
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
        {/* Header with FY Picker */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.screenTitle}>Tax Tracking</Text>
            <Text style={styles.screenSubtitle}>
              New Tax Regime (India) & TDS reconciliation.
            </Text>
          </View>

          {/* FY Pills */}
          <View style={styles.fyPillGroup}>
            {FY_OPTIONS.map((opt) => {
              const isSelected = year === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setYear(opt)}
                  style={[styles.fyPill, isSelected && styles.fyPillActive]}
                >
                  <Text
                    style={[
                      styles.fyPillText,
                      isSelected && styles.fyPillTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Hero Tax Liability Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroLabel}>ESTIMATED TAX LIABILITY</Text>
              <Text style={styles.heroAmount}>
                {formatCurrency(taxLiability)}
              </Text>
            </View>
            <View style={styles.heroIconBox}>
              <Calculator size={24} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatsGrid}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatLabel}>Gross Income</Text>
              <Text style={styles.heroStatVal}>
                {formatCurrency(grossIncome)}
              </Text>
            </View>

            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatLabel}>TDS + Adv Tax</Text>
              <Text style={styles.heroStatVal}>
                {formatCurrency(totalTaxPaid)}
              </Text>
            </View>

            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatLabel}>
                {isRefund ? 'Refund Due' : 'Net Tax Due'}
              </Text>
              <Text
                style={[
                  styles.heroStatVal,
                  isRefund ? styles.heroStatGreen : styles.heroStatRed,
                ]}
              >
                {formatCurrency(Math.abs(netDue))}
              </Text>
            </View>
          </View>
        </View>

        {/* Income Sources Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Income Sources</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Salary Income (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 1200000"
              placeholderTextColor={COLORS.textLight}
              value={salaryIncome}
              onChangeText={setSalaryIncome}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Business / Professional (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              value={businessIncome}
              onChangeText={setBusinessIncome}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Capital Gains (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              value={capitalGains}
              onChangeText={setCapitalGains}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Other Income / Savings Interest (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              value={otherIncome}
              onChangeText={setOtherIncome}
            />
          </View>
        </View>

        {/* Deductions & Exemptions Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Deductions (New Regime)</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Standard Deduction (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="50000"
              placeholderTextColor={COLORS.textLight}
              value={standardDeduction}
              onChangeText={setStandardDeduction}
            />
          </View>

          <View style={styles.summaryCallout}>
            <Text style={styles.calloutLabel}>Taxable Income:</Text>
            <Text style={styles.calloutVal}>{formatCurrency(taxableIncome)}</Text>
          </View>
        </View>

        {/* Taxes Paid Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Taxes Paid / Deducted</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TDS Deducted (Form 26AS / AIS) (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              value={tdsPaid}
              onChangeText={setTdsPaid}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Advance Tax Paid (Challan 280) (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              value={advanceTaxPaid}
              onChangeText={setAdvanceTaxPaid}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes & Remarks</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={2}
              placeholder="Tax planning reminders, filing dates..."
              placeholderTextColor={COLORS.textLight}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        {/* Save & Calculate Action */}
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.btnDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save & Calculate Tax</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Slab Info Toggle */}
        <TouchableOpacity
          style={styles.slabToggleBtn}
          onPress={() => setShowSlabs(!showSlabs)}
        >
          <HelpCircle size={15} color={COLORS.primary} />
          <Text style={styles.slabToggleText}>
            {showSlabs ? 'Hide Tax Slab Info' : 'View New Tax Regime Slabs'}
          </Text>
          <ChevronDown
            size={16}
            color={COLORS.primary}
            style={{ transform: [{ rotate: showSlabs ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {showSlabs && (
          <View style={styles.slabCard}>
            <Text style={styles.slabTitle}>New Regime Tax Slabs (India)</Text>
            <Text style={styles.slabDesc}>
              • Up to ₹3,00,000: 0% Nil{'\n'}
              • ₹3,00,001 to ₹6,00,000: 5%{'\n'}
              • ₹6,00,001 to ₹9,00,000: 10%{'\n'}
              • ₹9,00,001 to ₹12,00,000: 15%{'\n'}
              • ₹12,00,001 to ₹15,00,000: 20%{'\n'}
              • Above ₹15,00,000: 30%{'\n'}
              • Section 87A Rebate: Zero tax for taxable income ≤ ₹7,00,000.{'\n'}
              • Health & Education Cess: 4% on calculated tax.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 16,
  },
  headerTextCol: {
    marginBottom: 10,
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
  fyPillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  fyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  fyPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  fyPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 14,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatCol: {
    flex: 1,
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroStatGreen: {
    color: '#34D399',
  },
  heroStatRed: {
    color: '#F87171',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textMain,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  summaryCallout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  calloutLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  calloutVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  slabToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  slabCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 10,
  },
  slabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 6,
  },
  slabDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default TaxesScreen;
