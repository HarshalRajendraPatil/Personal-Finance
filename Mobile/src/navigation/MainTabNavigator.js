import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import AccountsScreen from '../pages/AccountsScreen';
import TransactionsScreen from '../pages/TransactionsScreen';
import PlanningScreen from '../pages/PlanningScreen';
import MoreScreen from '../pages/MoreScreen';
import {
  Wallet,
  ArrowRightLeft,
  PiggyBank,
  LayoutGrid,
  User,
  Activity,
} from 'lucide-react-native';
import { COLORS, SHADOWS } from '../styles/theme';

const Tab = createBottomTabNavigator();

const HeaderTitle = () => (
  <View style={styles.headerContainer}>
    <View style={styles.headerBadge}>
      <Activity size={18} color="#FFFFFF" strokeWidth={2.5} />
    </View>
    <Text style={styles.headerAppName}>Finora</Text>
  </View>
);

const HeaderProfileButton = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={styles.headerProfileBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {user?.profilePic ? (
        <Image source={{ uri: user.profilePic }} style={styles.profileAvatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <User size={16} color={COLORS.textSecondary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const MainTabNavigator = ({ navigation }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitle: () => <HeaderTitle />,
        headerTitleAlign: 'left',
        headerRight: () => <HeaderProfileButton navigation={navigation} />,
        headerStyle: {
          backgroundColor: COLORS.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
          height: 60,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          ...SHADOWS.md,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          tabBarLabel: 'Accounts',
          tabBarIcon: ({ color, size }) => (
            <Wallet size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <ArrowRightLeft size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Planning"
        component={PlanningScreen}
        options={{
          tabBarLabel: 'Planning',
          tabBarIcon: ({ color, size }) => (
            <PiggyBank size={size || 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid size={size || 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAppName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: 0.5,
  },
  headerProfileBtn: {
    marginRight: 16,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MainTabNavigator;
