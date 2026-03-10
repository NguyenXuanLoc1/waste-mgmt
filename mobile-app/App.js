import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Citizen screens
import CitizenDashboard from './src/screens/citizen/CitizenDashboard';
import SubmitReportScreen from './src/screens/citizen/SubmitReportScreen';
import MyReportsScreen from './src/screens/citizen/MyReportsScreen';
import WasteSortingGuideScreen from './src/screens/citizen/WasteSortingGuideScreen';
import RegulationsScreen from './src/screens/citizen/RegulationsScreen';

// Collector screens
import CollectorDashboard from './src/screens/collector/CollectorDashboard';

// Admin screens
import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminReports from './src/screens/admin/AdminReports';
import AdminCitizens from './src/screens/admin/AdminCitizens';

import { COLORS } from './src/components/UI';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '800' },
};

function RoleNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // Citizen Navigator
  if (user.role === 'citizen') {
    return (
      <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen name="CitizenDashboard" component={CitizenDashboard} options={{ title: '♻️ WasteMgmt' }} />
        <Stack.Screen name="SubmitReport" component={SubmitReportScreen} options={{ title: 'Submit Report' }} />
        <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My Reports' }} />
        <Stack.Screen name="WasteSortingGuide" component={WasteSortingGuideScreen} options={{ title: '♻️ Waste Sorting Guide' }} />
        <Stack.Screen name="Regulations" component={RegulationsScreen} options={{ title: '📢 Regulations & Announcements' }} />
      </Stack.Navigator>
    );
  }

  // Collector Navigator
  if (user.role === 'collector') {
    return (
      <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen name="CollectorDashboard" component={CollectorDashboard} options={{ title: '🚛 Collector' }} />
      </Stack.Navigator>
    );
  }

  // Admin Navigator
  if (user.role === 'admin') {
    return (
      <Stack.Navigator screenOptions={headerOptions}>
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: '🛡️ Admin' }} />
        <Stack.Screen name="AdminReports" component={AdminReports} options={{ title: 'All Reports' }} />
        <Stack.Screen name="AdminCitizens" component={AdminCitizens} options={{ title: 'Citizens' }} />
      </Stack.Navigator>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RoleNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
