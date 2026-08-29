import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import { COLORS, SHADOWS } from '../styles/theme';
import {
  Activity,
  Calendar as CalendarIcon,
  Calculator,
  Gem,
  Coins,
  Landmark,
  Users,
  Target,
  BarChart3,
  Tag,
  ShieldCheck,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react-native';

const MoreScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const navItems = [
    {
      title: 'Health Score & Insights',
      subtitle: '0-100 metric, anomaly detection & spending patterns',
      icon: Activity,
      color: '#6366F1',
      bgColor: '#EEF2FF',
      route: 'Intelligence',
    },
    {
      title: 'Financial Calendar',
      subtitle: 'Visual cash flow timeline & upcoming commitments',
      icon: CalendarIcon,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      route: 'Calendar',
    },
    {
      title: 'Tax Tracking',
      subtitle: 'New Regime tax liability & TDS reconciliation',
      icon: Calculator,
      color: '#0D9488',
      bgColor: '#CCFBF1',
      route: 'Taxes',
    },
    {
      title: 'Net Worth Tracking',
      subtitle: 'Assets vs. liabilities timeline & snapshots',
      icon: Gem,
      color: '#059669',
      bgColor: '#D1FAE5',
      route: 'NetWorth',
    },
    {
      title: 'Investments',
      subtitle: 'Portfolio value, asset allocation & returns',
      icon: Coins,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      route: 'Investments',
    },
    {
      title: 'Loans & EMIs',
      subtitle: 'Amortization schedules, interest & payments',
      icon: Landmark,
      color: '#EA580C',
      bgColor: '#FFF7ED',
      route: 'Loans',
    },
    {
      title: 'People & Ledgers',
      subtitle: 'Lending, borrowing, and settlements',
      icon: Users,
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
      route: 'People',
    },
    {
      title: 'Savings Goals',
      subtitle: 'Track progress toward financial targets',
      icon: Target,
      color: '#10B981',
      bgColor: '#ECFDF5',
      route: 'Goals',
    },
    {
      title: 'Reports & Insights',
      subtitle: 'Cash flow analysis, trends, CSV exports',
      icon: BarChart3,
      color: '#EC4899',
      bgColor: '#FCE7F3',
      route: 'Reports',
    },
    {
      title: 'Categories & Subcategories',
      subtitle: 'Organize transaction classification & icons',
      icon: Tag,
      color: '#64748B',
      bgColor: '#F1F5F9',
      route: 'Categories',
    },
    {
      title: 'Profile & Security',
      subtitle: 'Update info, change password & security',
      icon: ShieldCheck,
      color: '#475569',
      bgColor: '#F8FAFC',
      route: 'Profile',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarBox}>
            <User size={26} color={COLORS.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'My Account'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          </View>
        </View>

        {/* Feature Hub Items */}
        <View style={styles.hubSection}>
          <Text style={styles.sectionHeader}>TOOLS & WEALTH INTELLIGENCE</Text>
          <View style={styles.menuList}>
            {navItems.map((item, index) => {
              const IconComp = item.icon;
              const isLast = index === navItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.title}
                  style={[styles.menuItem, !isLast && styles.itemBorder]}
                  onPress={() => navigation.navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: item.bgColor },
                    ]}
                  >
                    <IconComp size={20} color={item.color} />
                  </View>

                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>

                  <ChevronRight size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  hubSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuList: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemTextCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },
});

export default MoreScreen;
