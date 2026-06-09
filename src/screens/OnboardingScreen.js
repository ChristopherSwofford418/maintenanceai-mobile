import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { supabase, ANON_KEY, AI_PROXY_URL } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'

const HOME_TYPES = [
  { id: 'house', label: '🏠 House', desc: 'Single-family home' },
  { id: 'condo', label: '🏢 Condo', desc: 'Shared building unit' },
  { id: 'apartment', label: '🏗️ Apartment', desc: 'Rental unit' },
  { id: 'townhouse', label: '🏘️ Townhouse', desc: 'Multi-level attached home' },
]

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [homeType, setHomeType] = useState('')
  const [homeYear, setHomeYear] = useState('')
  const [vehicles, setVehicles] = useState('1')
  const [loading, setLoading] = useState(false)

  // Step 0: Welcome / landing
  // Step 1: Login or Register
  // Step 2: Home type
  // Step 3: Home year + vehicles
  // Step 4: Name
  // Step 5: Generating schedule (AI)

  const isLoggedIn = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  }

  const handleGetStarted = async () => {
    const loggedIn = await isLoggedIn()
    if (loggedIn) {
      setStep(2)
    } else {
      navigation.navigate('Auth', { mode: 'signup' })
    }
  }

  const handleSignIn = () => navigation.navigate('Auth', { mode: 'signin' })

  const handleFinish = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter your name.')
    setLoading(true)
    setStep(5)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Save profile
      await supabase.from('maintenance_profiles').upsert({
        id: user.id,
        name: name.trim(),
        home_type: homeType,
        home_year: parseInt(homeYear) || null,
        vehicles: parseInt(vehicles) || 0,
        subscribed: false,
      })

      // Generate AI maintenance schedule
      await generateSchedule(user.id)

      navigation.replace('Main')
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save profile. Please try again.')
      setStep(4)
    }
    setLoading(false)
  }

  const generateSchedule = async (userId) => {
    try {
      const homeAge = homeYear ? new Date().getFullYear() - parseInt(homeYear) : 10
      const prompt = `You are a home and auto maintenance expert. Generate a maintenance schedule for:
- Home type: ${homeType}
- Home age: approximately ${homeAge} years old
- Number of vehicles: ${vehicles}

Generate 15-20 maintenance tasks as a JSON array. Include a mix of home systems and vehicle tasks. Each task:
{
  "category": "home" or "vehicle",
  "item": "specific system/appliance/vehicle part",
  "task": "specific maintenance action",
  "due_date": "YYYY-MM-DD (within next 12 months, spread out)",
  "recurring_days": number (how often in days, e.g. 90, 180, 365),
  "status": "pending"
}

Include tasks for: HVAC filter, water heater, smoke detectors, gutters, roof inspection, plumbing, electrical, oil change, tire rotation, brake inspection, air filters. Prioritize based on home age. Return ONLY valid JSON array.`

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
        }),
      })
      const data = await res.json()
      const content = (data?.content || '').replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
      const tasks = JSON.parse(content)
      if (Array.isArray(tasks) && tasks.length > 0) {
        const tasksWithUserId = tasks.map(t => ({ ...t, user_id: userId }))
        await supabase.from('maintenance_tasks').insert(tasksWithUserId)
      }
    } catch (e) {
      console.warn('Schedule generation failed:', e)
      // Non-fatal — user can add tasks manually
    }
  }

  if (step === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.bigEmoji}>🔧</Text>
          <Text style={s.brand}>MaintenanceAI</Text>
          <Text style={s.tagline}>Your Home & Vehicle Guardian</Text>
          <Text style={s.sub}>
            AI-powered maintenance tracking that predicts problems before they happen — for your home and every vehicle you own.
          </Text>
          <View style={s.features}>
            {[
              '🏠 Track all home systems & appliances',
              '🚗 Monitor every vehicle in one place',
              '📷 AI photo diagnosis for any problem',
              '💡 Predicts maintenance before it breaks',
              '💰 Cost estimates + DIY guidance',
            ].map(f => (
              <View key={f} style={s.featureRow}>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.buttons}>
          <TouchableOpacity style={s.btn} onPress={handleGetStarted}>
            <Text style={s.btnText}>Get Started Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.linkBtn} onPress={handleSignIn}>
            <Text style={s.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (step === 2) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text style={s.stepLabel}>Step 1 of 3</Text>
          <Text style={s.stepTitle}>What type of home do you have?</Text>
          <Text style={s.stepSub}>We'll customize your maintenance schedule based on your home type.</Text>
          {HOME_TYPES.map(h => (
            <TouchableOpacity
              key={h.id}
              style={[s.optionCard, homeType === h.id && s.optionCardSelected]}
              onPress={() => setHomeType(h.id)}
            >
              <Text style={s.optionLabel}>{h.label}</Text>
              <Text style={s.optionDesc}>{h.desc}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.btn, { marginTop: 24, opacity: homeType ? 1 : 0.4 }]}
            onPress={() => homeType && setStep(3)}
            disabled={!homeType}
          >
            <Text style={s.btnText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (step === 3) {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text style={s.stepLabel}>Step 2 of 3</Text>
            <Text style={s.stepTitle}>About Your Home</Text>
            <Text style={s.stepSub}>We'll use this to prioritize older system maintenance.</Text>

            <Text style={s.fieldLabel}>Year built (or approx.)</Text>
            <TextInput
              style={s.input}
              value={homeYear}
              onChangeText={setHomeYear}
              placeholder="e.g. 1998"
              placeholderTextColor="#4b5563"
              keyboardType="number-pad"
              maxLength={4}
            />

            <Text style={s.fieldLabel}>Number of vehicles</Text>
            <View style={s.vehicleRow}>
              {['0', '1', '2', '3', '4', '5+'].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[s.vehicleBtn, vehicles === n && s.vehicleBtnSelected]}
                  onPress={() => setVehicles(n)}
                >
                  <Text style={[s.vehicleBtnText, vehicles === n && s.vehicleBtnTextSelected]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[s.btn, { marginTop: 32 }]} onPress={() => setStep(4)}>
              <Text style={s.btnText}>Continue →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  if (step === 4) {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text style={s.stepLabel}>Step 3 of 3</Text>
            <Text style={s.stepTitle}>What should we call you?</Text>
            <Text style={s.stepSub}>Just a first name is fine.</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Your first name"
              placeholderTextColor="#4b5563"
              autoCapitalize="words"
              autoFocus
            />
            <TouchableOpacity
              style={[s.btn, { marginTop: 24, opacity: name.trim() ? 1 : 0.4 }]}
              onPress={handleFinish}
              disabled={!name.trim()}
            >
              <Text style={s.btnText}>Build My Schedule 🔧</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(3)}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Step 5: Loading / generating schedule
  return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 64, marginBottom: 24 }}>🤖</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
          Building Your Schedule
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Our AI is generating a personalized maintenance plan based on your home and vehicles...
        </Text>
        <ActivityIndicator color={AMBER} size="large" />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bigEmoji: { fontSize: 72, marginBottom: 16 },
  brand: { color: AMBER, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  tagline: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  sub: { color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  features: { gap: 8, width: '100%' },
  featureRow: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  featureText: { color: '#e5e7eb', fontSize: 14 },
  buttons: { gap: 12, paddingHorizontal: 24, paddingBottom: 32 },
  btn: { backgroundColor: AMBER, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  linkBtn: { paddingVertical: 14, alignItems: 'center' },
  linkText: { color: '#9ca3af', fontSize: 15 },
  stepLabel: { color: AMBER, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  stepTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  stepSub: { color: '#6b7280', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  optionCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionCardSelected: { borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.1)' },
  optionLabel: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  optionDesc: { color: '#6b7280', fontSize: 13 },
  fieldLabel: { color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  vehicleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  vehicleBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleBtnSelected: { borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.15)' },
  vehicleBtnText: { color: '#6b7280', fontSize: 18, fontWeight: '700' },
  vehicleBtnTextSelected: { color: AMBER },
  backBtn: { paddingVertical: 16, alignItems: 'center' },
  backText: { color: '#6b7280', fontSize: 14 },
})
