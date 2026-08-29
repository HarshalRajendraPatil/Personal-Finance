import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { loadStoredUser } from '../store/authSlice';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import ProfileScreen from '../pages/ProfileScreen';
import PeopleScreen from '../pages/PeopleScreen';
import GoalsScreen from '../pages/GoalsScreen';
import ReportsScreen from '../pages/ReportsScreen';
import CategoriesScreen from '../pages/CategoriesScreen';
import BudgetsScreen from '../pages/BudgetsScreen';
import BillsScreen from '../pages/BillsScreen';
import NetWorthScreen from '../pages/NetWorthScreen';
import InvestmentsScreen from '../pages/InvestmentsScreen';
import LoansScreen from '../pages/LoansScreen';
import IntelligenceScreen from '../pages/IntelligenceScreen';
import CalendarScreen from '../pages/CalendarScreen';
import TaxesScreen from '../pages/TaxesScreen';
import { COLORS } from '../styles/theme';
import { Activity } from 'lucide-react-native';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isInitialized } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadStoredUser());
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoBadge}>
          <Activity size={36} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: COLORS.surface,
            },
            headerTintColor: COLORS.textMain,
            headerTitleStyle: {
              fontWeight: '700',
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Intelligence"
            component={IntelligenceScreen}
            options={{
              title: 'Health Score & Insights',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
              title: 'Financial Calendar',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Taxes"
            component={TaxesScreen}
            options={{
              title: 'Tax Tracking',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="NetWorth"
            component={NetWorthScreen}
            options={{
              title: 'Net Worth Tracking',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Investments"
            component={InvestmentsScreen}
            options={{
              title: 'Investments',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Loans"
            component={LoansScreen}
            options={{
              title: 'Loans & EMIs',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="People"
            component={PeopleScreen}
            options={{
              title: 'People & Ledgers',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Goals"
            component={GoalsScreen}
            options={{
              title: 'Savings Goals',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Reports"
            component={ReportsScreen}
            options={{
              title: 'Reports & Trends',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={{
              title: 'Categories',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Budgets"
            component={BudgetsScreen}
            options={{
              title: 'Budgets',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Bills"
            component={BillsScreen}
            options={{
              title: 'Bills & Subscriptions',
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Your Profile',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
