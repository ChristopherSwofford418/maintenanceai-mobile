import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'
const GREEN = '#22c55e'

export default function HistoryScreen({ navigation }) {
  const [tasks, setTasks] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState('tasks')
  const [subscribed, setSubscribed] = useState(false)

  useFocusEffect(useCallback(() => {
    load()
  }, []))

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: taskData }, { data: diagData }] = await Promise.all([
        supabase.from('maintenance_profiles').select('subscribed').eq('id', user.id).single(),
        supabase.from('maintenance_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(50),
        supabase.from('maintenance_diagnoses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      setSubscribed(prof?.subscribed || false)
      setTasks(taskData || [])
      setDiagnoses(diagData || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const deleteTask = async (id) => {
    Alert.alert('Remove from history?', 'This will permanently delete this record.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('maintenance_tasks').delete().eq('id', id)
        setTasks(prev => prev.filter(t => t.id !== id))
      }},
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={AMBER} />
      </SafeAreaView>
    )
  }

  const showPaywall = !subscribed && (tasks.length > 3 || diagnoses.length > 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <Text style={s.title}>History</Text>
        <Text style={s.subtitle}>Your completed maintenance log</Text>

        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, tab === 'tasks' && s.tabActive]}
            onPress={() => setTab('tasks')}
          >
            <Text style={[s.tabText, tab === 'tasks' && s.tabTextActive]}>🔧 Tasks ({tasks.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === 'diagnoses' && s.tabActive]}
            onPress={() => setTab('diagnoses')}
          >
            <Text style={[s.tabText, tab === 'diagnoses' && s.tabTextActive]}>📷 Diagnoses ({diagnoses.length})</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={AMBER} />}
      >
        {showPaywall && (
          <TouchableOpacity
            style={s.upgradeCard}
            onPress={() => navigation.navigate('Paywall')}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>🔓</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 4 }}>Unlock Full History</Text>
            <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Upgrade to Premium for unlimited history access</Text>
            <View style={s.upgradeBtn}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Upgrade to Premium</Text>
            </View>
          </TouchableOpacity>
        )}

        {tab === 'tasks' && (
          <>
            {tasks.length === 0 ? (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>No completed tasks yet</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Complete tasks from the Dashboard to see them here</Text>
              </View>
            ) : (
              tasks.slice(0, subscribed ? 999 : 5).map(t => (
                <TouchableOpacity key={t.id} style={s.historyCard} onLongPress={() => deleteTask(t.id)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: GREEN, fontWeight: '700', textTransform: 'uppercase' }}>
                      {t.category === 'home' ? '🏠 HOME' : '🚗 VEHICLE'}
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 11 }}>· {formatDate(t.completed_at)}</Text>
                  </View>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t.item}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>{t.task}</Text>
                  <View style={[s.chip, { alignSelf: 'flex-start', marginTop: 8, backgroundColor: `${GREEN}15` }]}>
                    <Text style={{ color: GREEN, fontSize: 11, fontWeight: '700' }}>✓ Completed</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {tab === 'diagnoses' && (
          <>
            {diagnoses.length === 0 ? (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>📷</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>No diagnoses yet</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Use the Diagnose tab to analyze problems</Text>
                <TouchableOpacity
                  style={[s.upgradeBtn, { marginTop: 16 }]}
                  onPress={() => navigation.navigate('Diagnose')}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Try AI Diagnosis</Text>
                </TouchableOpacity>
              </View>
            ) : (
              diagnoses.slice(0, subscribed ? 999 : 3).map(d => (
                <View key={d.id} style={s.historyCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#6b7280', fontSize: 11 }}>{formatDate(d.created_at)}</Text>
                    {d.severity && (
                      <Text style={{
                        fontSize: 11, fontWeight: '700',
                        color: d.severity === 'Critical' ? '#ef4444' : d.severity === 'High' ? '#f97316' : d.severity === 'Medium' ? '#eab308' : '#22c55e',
                      }}>
                        {d.severity}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{d.problem}</Text>
                  {d.cost_estimate && (
                    <Text style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>💰 {d.cost_estimate}</Text>
                  )}
                  {d.diy_difficulty && (
                    <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                      DIY: {'⭐'.repeat(d.diy_difficulty)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { borderColor: AMBER, backgroundColor: 'rgba(245,158,11,0.1)' },
  tabText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: AMBER },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  historyCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upgradeCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeBtn: {
    backgroundColor: AMBER,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },
})
