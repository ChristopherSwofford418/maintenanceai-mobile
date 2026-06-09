import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const YELLOW = '#eab308'
const GREEN = '#22c55e'

const HOME_SYSTEMS = [
  { id: 'hvac', label: 'HVAC & Heating', emoji: '❄️', desc: 'Filter changes, service, inspections' },
  { id: 'plumbing', label: 'Plumbing', emoji: '🚰', desc: 'Pipes, water heater, drains' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡', desc: 'Panel, outlets, smoke detectors' },
  { id: 'roof', label: 'Roof & Gutters', emoji: '🏠', desc: 'Shingles, gutters, downspouts' },
  { id: 'appliances', label: 'Appliances', emoji: '🍳', desc: 'Washer, dryer, fridge, dishwasher' },
  { id: 'exterior', label: 'Exterior', emoji: '🌳', desc: 'Siding, windows, driveway, deck' },
  { id: 'foundation', label: 'Foundation', emoji: '🏗️', desc: 'Basement, crawl space, waterproofing' },
  { id: 'security', label: 'Security', emoji: '🔒', desc: 'Alarms, cameras, locks, smoke/CO' },
]

function getHealthColor(tasks) {
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
  const dueSoon = tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date() && new Date(t.due_date) <= new Date(Date.now() + 30 * 86400000))
  if (overdue.length > 0) return RED
  if (dueSoon.length > 0) return YELLOW
  return GREEN
}

function getHealthScore(tasks) {
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length
  const dueSoon = tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date() && new Date(t.due_date) <= new Date(Date.now() + 30 * 86400000)).length
  return Math.max(0, 100 - overdue * 20 - dueSoon * 8)
}

export default function HomeScreen({ navigation }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [systemTasks, setSystemTasks] = useState([])

  useFocusEffect(useCallback(() => {
    load()
  }, []))

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('maintenance_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'home')
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
      setTasks(data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  const openSystem = (system) => {
    const filtered = tasks.filter(t =>
      t.item?.toLowerCase().includes(system.id) ||
      t.task?.toLowerCase().includes(system.label.toLowerCase()) ||
      t.item?.toLowerCase().includes(system.label.split(' ')[0].toLowerCase())
    )
    setSystemTasks(filtered)
    setSelectedSystem(system)
  }

  const completeTask = async (task) => {
    await supabase.from('maintenance_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
    setSystemTasks(prev => prev.filter(t => t.id !== task.id))
  }

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
        <Text style={s.title}>Home Systems</Text>
        <Text style={s.subtitle}>Track maintenance for every part of your home</Text>

        {HOME_SYSTEMS.map(system => {
          const systemTaskList = tasks.filter(t =>
            t.item?.toLowerCase().includes(system.id) ||
            t.task?.toLowerCase().includes(system.label.toLowerCase()) ||
            t.item?.toLowerCase().includes(system.label.split(' ')[0].toLowerCase())
          )
          const healthColor = getHealthColor(systemTaskList)
          const score = getHealthScore(systemTaskList)
          const pendingCount = systemTaskList.length

          return (
            <TouchableOpacity
              key={system.id}
              style={s.systemCard}
              onPress={() => openSystem(system)}
            >
              <View style={s.systemLeft}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>{system.emoji}</Text>
                <View style={[s.scoreBadge, { backgroundColor: `${healthColor}20`, borderColor: `${healthColor}50` }]}>
                  <Text style={{ color: healthColor, fontSize: 12, fontWeight: '800' }}>{score}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.systemName}>{system.label}</Text>
                <Text style={s.systemDesc}>{system.desc}</Text>
                {pendingCount > 0 ? (
                  <Text style={{ color: healthColor === RED ? RED : healthColor === YELLOW ? YELLOW : '#6b7280', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                    {pendingCount} task{pendingCount > 1 ? 's' : ''} pending
                  </Text>
                ) : (
                  <Text style={{ color: '#374151', fontSize: 12, marginTop: 4 }}>No pending tasks</Text>
                )}
              </View>
              <Text style={{ color: '#374151', fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          )
        })}

        <TouchableOpacity
          style={s.addBtn}
          onPress={() => navigation.navigate('AddTask', { category: 'home' })}
        >
          <Text style={{ color: AMBER, fontWeight: '700', fontSize: 15 }}>+ Add Home Task</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* System Detail Modal */}
      <Modal
        visible={!!selectedSystem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSystem(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <View style={s.modalHeader}>
            <View>
              <Text style={{ fontSize: 28 }}>{selectedSystem?.emoji}</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 4 }}>{selectedSystem?.label}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedSystem(null)}>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {systemTasks.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>All caught up!</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                  No pending tasks for {selectedSystem?.label}
                </Text>
              </View>
            ) : (
              systemTasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                const color = isOverdue ? RED : AMBER
                return (
                  <View key={task.id} style={[s.taskRow, { borderLeftColor: color }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{task.task}</Text>
                      <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                        {task.due_date ? `Due: ${task.due_date}` : 'No due date'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.doneBtn, { borderColor: color }]}
                      onPress={() => completeTask(task)}
                    >
                      <Text style={{ color }}>✓</Text>
                    </TouchableOpacity>
                  </View>
                )
              })
            )}
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => {
                setSelectedSystem(null)
                navigation.navigate('AddTask', { category: 'home', item: selectedSystem?.label })
              }}
            >
              <Text style={{ color: AMBER, fontWeight: '700' }}>+ Add Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 20 },
  systemCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  systemLeft: { alignItems: 'center', width: 48 },
  scoreBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 4,
  },
  systemName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  systemDesc: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  addBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  taskRow: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    gap: 12,
  },
  doneBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
})
