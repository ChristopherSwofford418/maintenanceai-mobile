import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const YELLOW = '#eab308'
const GREEN = '#22c55e'

function ScoreRing({ score, label, color }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 4, borderColor: color,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${color}15`,
      }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{score}</Text>
      </View>
      <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 6, fontWeight: '600' }}>{label}</Text>
    </View>
  )
}

function TaskCard({ task, onComplete }) {
  const isOverdue = task.status === 'overdue' || (task.due_date && new Date(task.due_date) < new Date())
  const isDueSoon = !isOverdue && task.due_date && new Date(task.due_date) <= new Date(Date.now() + 30 * 86400000)
  const color = isOverdue ? RED : isDueSoon ? YELLOW : GREEN
  const daysLabel = () => {
    if (!task.due_date) return ''
    const days = Math.ceil((new Date(task.due_date) - new Date()) / 86400000)
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days === 0) return 'Due today'
    return `Due in ${days} days`
  }

  return (
    <View style={[s.taskCard, { borderLeftColor: color }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontSize: 11, color: color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {task.category === 'home' ? '🏠 HOME' : '🚗 VEHICLE'}
          </Text>
        </View>
        <Text style={s.taskItem}>{task.item}</Text>
        <Text style={s.taskName}>{task.task}</Text>
        {task.due_date && (
          <Text style={[s.taskDate, { color }]}>{daysLabel()}</Text>
        )}
      </View>
      <TouchableOpacity style={[s.doneBtn, { borderColor: color }]} onPress={() => onComplete(task)}>
        <Text style={{ color, fontSize: 16 }}>✓</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => {
    load()
  }, []))

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: prof }, { data: taskData }] = await Promise.all([
        supabase.from('maintenance_profiles').select('*').eq('id', user.id).single(),
        supabase.from('maintenance_tasks')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'completed')
          .order('due_date', { ascending: true })
          .limit(20),
      ])
      setProfile(prof)
      setTasks(taskData || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  const completeTask = async (task) => {
    await supabase.from('maintenance_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const now = new Date()
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now)
  const dueSoon = tasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= new Date(now.getTime() + 30 * 86400000))
  const upcoming = tasks.filter(t => !t.due_date || new Date(t.due_date) > new Date(now.getTime() + 30 * 86400000))

  const homeScore = Math.max(0, 100 - overdue.filter(t => t.category === 'home').length * 15 - dueSoon.filter(t => t.category === 'home').length * 5)
  const vehicleScore = Math.max(0, 100 - overdue.filter(t => t.category === 'vehicle').length * 15 - dueSoon.filter(t => t.category === 'vehicle').length * 5)

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={AMBER} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={AMBER} />}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <View>
            <Text style={s.greeting}>Hey {profile?.name || 'there'} 👋</Text>
            <Text style={s.subtitle}>Your Maintenance Hub</Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('AddTask')}
          >
            <Text style={{ color: AMBER, fontSize: 24 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Health Scores */}
        <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 }]}>
          <ScoreRing
            score={homeScore}
            label="Home Score"
            color={homeScore >= 80 ? GREEN : homeScore >= 60 ? YELLOW : RED}
          />
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <ScoreRing
            score={vehicleScore}
            label="Vehicle Score"
            color={vehicleScore >= 80 ? GREEN : vehicleScore >= 60 ? YELLOW : RED}
          />
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <View style={[s.statCard, { borderColor: `${RED}40` }]}>
            <Text style={[s.statNum, { color: RED }]}>{overdue.length}</Text>
            <Text style={s.statLabel}>Overdue</Text>
          </View>
          <View style={[s.statCard, { borderColor: `${YELLOW}40` }]}>
            <Text style={[s.statNum, { color: YELLOW }]}>{dueSoon.length}</Text>
            <Text style={s.statLabel}>Due Soon</Text>
          </View>
          <View style={[s.statCard, { borderColor: `${GREEN}40` }]}>
            <Text style={[s.statNum, { color: GREEN }]}>{upcoming.length}</Text>
            <Text style={s.statLabel}>Upcoming</Text>
          </View>
        </View>

        {/* Overdue */}
        {overdue.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={{ color: RED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>🚨 Overdue</Text>
            </View>
            {overdue.slice(0, 3).map(t => (
              <TaskCard key={t.id} task={t} onComplete={completeTask} />
            ))}
          </>
        )}

        {/* Due Soon */}
        {dueSoon.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={{ color: YELLOW, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>⚠️ Due Soon (30 days)</Text>
            </View>
            {dueSoon.slice(0, 3).map(t => (
              <TaskCard key={t.id} task={t} onComplete={completeTask} />
            ))}
          </>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={{ color: GREEN, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>✅ Upcoming</Text>
            </View>
            {upcoming.slice(0, 3).map(t => (
              <TaskCard key={t.id} task={t} onComplete={completeTask} />
            ))}
          </>
        )}

        {tasks.length === 0 && (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>All caught up!</Text>
            <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>No pending maintenance tasks. Add a task to get started.</Text>
            <TouchableOpacity
              style={[s.addTaskBtn, { marginTop: 20 }]}
              onPress={() => navigation.navigate('AddTask')}
            >
              <Text style={{ color: AMBER, fontWeight: '700' }}>+ Add Task</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Diagnose')}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📷</Text>
            <Text style={s.quickLabel}>Diagnose Problem</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('AddTask')}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>➕</Text>
            <Text style={s.quickLabel}>Add Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('History')}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📋</Text>
            <Text style={s.quickLabel}>View History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 14, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNum: { fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', marginTop: 2 },
  sectionHeader: { marginBottom: 8, marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  taskCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskItem: { color: '#fff', fontSize: 15, fontWeight: '700' },
  taskName: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  taskDate: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  doneBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  addTaskBtn: {
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '600', textAlign: 'center' },
})
