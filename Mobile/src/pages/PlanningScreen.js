import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import BudgetsScreen from './BudgetsScreen';
import BillsScreen from './BillsScreen';
import { COLORS, SHADOWS } from '../styles/theme';
import { PiggyBank, CalendarClock } from 'lucide-react-native';

const PlanningScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Budgets');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Segmented Header Switcher */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'Budgets' && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab('Budgets')}
        >
          <PiggyBank
            size={16}
            color={
              activeTab === 'Budgets' ? COLORS.primary : COLORS.textSecondary
            }
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === 'Budgets' && styles.segmentBtnTextActive,
            ]}
          >
            Budgets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'Bills' && styles.segmentBtnActive,
          ]}
          onPress={() => setActiveTab('Bills')}
        >
          <CalendarClock
            size={16}
            color={
              activeTab === 'Bills' ? COLORS.primary : COLORS.textSecondary
            }
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeTab === 'Bills' && styles.segmentBtnTextActive,
            ]}
          >
            Bills & Subscriptions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Content */}
      <View style={styles.content}>
        {activeTab === 'Budgets' ? (
          <BudgetsScreen navigation={navigation} />
        ) : (
          <BillsScreen navigation={navigation} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentBtnTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});

export default PlanningScreen;
