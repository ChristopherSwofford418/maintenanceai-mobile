import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Linking,
} from 'react-native'
import { supabase } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'

export default function AuthScreen({ navigation, route }) {
  const [mode, setMode] = useState(route?.params?.mode || 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Required', 'Please enter email and password.')
    setLoading(true)
    try {
      let error
      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({ email, password })
        error = e
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password })
        error = e
      }
      if (error) throw error
      // Check if profile/onboarding complete
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('maintenance_profiles')
          .select('name')
          .eq('id', user.id)
          .single()
        navigation.replace(profile?.name ? 'Main' : 'SetupOnboarding')
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}>
        <Text style={s.emoji}>🔧</Text>
        <Text style={s.brand}>MaintenanceAI</Text>
        <Text style={s.title}>{mode === 'signup' ? 'Create Account' : 'Welcome Back'}</Text>
        <Text style={s.subtitle}>
          {mode === 'signup' ? 'Start tracking your home & vehicle maintenance' : 'Sign in to your maintenance hub'}
        </Text>

        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#4b5563"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#4b5563"
          secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>{mode === 'signup' ? 'Create Account' : 'Sign In'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.toggle} onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={s.toggleText}>
            {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={s.legal}>
          <TouchableOpacity onPress={() => Linking.openURL('https://maintenanceai.io/privacy')}>
            <Text style={s.legalText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}> · </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://maintenanceai.io/terms')}>
            <Text style={s.legalText}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  brand: { color: AMBER, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: AMBER,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  toggle: { paddingVertical: 16, alignItems: 'center' },
  toggleText: { color: '#6b7280', fontSize: 14 },
  legal: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  legalText: { color: '#374151', fontSize: 12 },
  legalDot: { color: '#374151', fontSize: 12 },
})
