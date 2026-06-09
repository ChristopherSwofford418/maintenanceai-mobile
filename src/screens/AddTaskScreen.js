import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { supabase } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'

const RECURRING_OPTIONS = [
  { label: 'One-time', days: null },
  { label: 'Weekly', days: 7 },
  { label: 'Monthly', days: 30 },
  { label: 'Every 3 months', days: 90 },
  { label: 'Every 6 months', days: 180 },
  { label: 'Yearly', days: 365 },
]

const HOME_ITEMS = [
  'HVAC System', 'Water Heater', 'Roof', 'Gutters', 'Plumbing',
  'Electrical Panel', 'Smoke Detectors', 'Appliances', 'Exterior',
  'Foundation', 'Windows & Doors', 'Other',
]

export default function AddTaskScreen({ navigation, route }) {
  const defaultCategory = route?.params?.category || 'home'
  const defaultItem = route?.params?.item || ''

  const [category, setCategory] = useState(defaultCategory)
  const [item, setItem] = useState(defaultItem)
  const [task, setTask] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState(RECURRING_OPTIONS[0])
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!item.trim() || !task.trim()) {
      return Alert.alert('Required', 'Please fill in the item and task fields.')
    }

    // Validate date format
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return Alert.alert('Invalid Date', 'Please use format YYYY-MM-DD (e.g. 2025-08-15)')
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check free tier limit
      const { data: profile } = await supabase.from('maintenance_profiles').select('subscribed').eq('id', user.id).single()
      if (!profile?.subscribed) {
        const { count } = await supabase.from('maintenance_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .neq('status', 'completed')
        if ((count || 0) >= 3) {
          setLoading(false)
          Alert.alert(
            'Free Limit Reached',
            'You have 3 tasks (free limit). Upgrade to Premium for unlimited tasks.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
            ]
          )
          return
        }
      }

      await supabase.from('maintenance_tasks').insert({
        user_id: user.id,
        category,
        item: item.trim(),
        task: task.trim(),
        due_date: dueDate || null,
        recurring_days: recurring.days,
        status: 'pending',
      })

      Alert.alert('Task Added! ✅', `"${task}" has been added to your maintenance schedule.`, [
        { text: 'Add Another', onPress: () => { setItem(defaultItem); setTask(''); setDueDate('') } },
        { text: 'Done', onPress: () => navigation.goBack() },
      ])
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save task.')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add Maintenance Task</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {/* Category */}
          <Text style={s.fieldLabel}>Category</Text>
          <View style={s.categoryRow}>
            <TouchableOpacity
              style={[s.categoryBtn, category === 'home' && s.categoryBtnActive]}
              onPress={() => setCategory('home')}
            >
              <Text style={[s.categoryBtnText, category === 'home' && s.categoryBtnTextActive]}>🏠 Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.categoryBtn, category === 'vehicle' && s.categoryBtnActive]}
              onPress={() => setCategory('vehicle')}
            >
              <Text style={[s.categoryBtnText, category === 'vehicle' && s.categoryBtnTextActive]}>🚗 Vehicle</Text>
            </TouchableOpacity>
          </View>

          {/* Item / System */}
          <Text style={s.fieldLabel}>
            {category === 'home' ? 'Home System / Appliance' : 'Vehicle'}
          </Text>
          <TextInput
            style={s.input}
            value={item}
            onChangeText={setItem}
            placeholder={category === 'home' ? 'e.g. HVAC System, Water Heater' : 'e.g. 2019 Toyota Camry'}
            placeholderTextColor="#4b5563"
            autoCapitalize="words"
          />

          {/* Quick pick for home */}
          {category === 'home' && !defaultItem && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginTop: -8 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {HOME_ITEMS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[s.quickPick, item === h && s.quickPickActive]}
                    onPress={() => setItem(h)}
                  >
                    <Text style={[s.quickPickText, item === h && s.quickPickTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Task */}
          <Text style={s.fieldLabel}>Task / Action</Text>
          <TextInput
            style={s.input}
            value={task}
            onChangeText={setTask}
            placeholder="e.g. Replace air filter, Oil change"
            placeholderTextColor="#4b5563"
            autoCapitalize="sentences"
          />

          {/* Due Date */}
          <Text style={s.fieldLabel}>Due Date (optional)</Text>
          <TextInput
            style={s.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD (e.g. 2025-09-01)"
            placeholderTextColor="#4b5563"
            keyboardType="numeric"
          />

          {/* Recurring */}
          <Text style={s.fieldLabel}>Repeats</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {RECURRING_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.label}
                  style={[s.recurringBtn, recurring.label === opt.label && s.recurringBtnActive]}
                  onPress={() => setRecurring(opt)}
                >
                  <Text style={[s.recurringBtnText, recurring.label === opt.label && s.recurringBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[s.saveBtn, { opacity: item.trim() && task.trim() ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={loading || !item.trim() || !task.trim()}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Save Task ✅</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fieldLabel: { color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 15,
    marginBottom: 20,
  },
  categoryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  categoryBtn: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  categoryBtnActive: { borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.12)' },
  categoryBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
  categoryBtnTextActive: { color: AMBER },
  quickPick: {
    backgroundColor: CARD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickPickActive: { borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.12)' },
  quickPickText: { color: '#6b7280', fontSize: 12 },
  quickPickTextActive: { color: AMBER },
  recurringBtn: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  recurringBtnActive: { borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.12)' },
  recurringBtnText: { color: '#6b7280', fontSize: 13 },
  recurringBtnTextActive: { color: AMBER, fontWeight: '700' },
  saveBtn: {
    backgroundColor: AMBER,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
})
