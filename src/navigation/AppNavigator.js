import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { supabase } from '../lib/supabase'

import OnboardingScreen from '../screens/OnboardingScreen'
import AuthScreen from '../screens/AuthScreen'
import DashboardScreen from '../screens/DashboardScreen'
import HomeScreen from '../screens/HomeScreen'
import VehicleScreen from '../screens/VehicleScreen'
import DiagnoseScreen from '../screens/DiagnoseScreen'
import AddTaskScreen from '../screens/AddTaskScreen'
import HistoryScreen from '../screens/HistoryScreen'
import PaywallScreen from '../screens/PaywallScreen'
import SettingsScreen from '../screens/SettingsScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const BG = '#0a0f1a'
const AMBER = '#f59e0b'

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d1525',
          borderTopColor: 'rgba(255,255,255,0.06)',
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
        },
        tabBarActiveTintColor: AMBER,
        tabBarInactiveTintColor: '#4b5563',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} /> }}
      />
      <Tab.Screen
        name="Vehicles"
        component={VehicleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" focused={focused} /> }}
      />
      <Tab.Screen
        name="Diagnose"
        component={DiagnoseScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} /> }}
      />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const [loading, setLoading] = useState(true)
  const [initialRoute, setInitialRoute] = useState('Onboarding')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if onboarding complete
        const { data: profile } = await supabase
          .from('maintenance_profiles')
          .select('name')
          .eq('id', session.user.id)
          .single()
        setInitialRoute(profile?.name ? 'Main' : 'SetupOnboarding')
      } else {
        setInitialRoute('Onboarding')
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔧</Text>
        <ActivityIndicator color={AMBER} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="SetupOnboarding" component={OnboardingScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        <Stack.Screen name="AddTask" component={AddTaskScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
