import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const YELLOW = '#eab308'
const GREEN = '#22c55e'

const VEHICLE_SERVICES = [
  { key: 'oil', label: 'Oil Change', emoji: '🛢️', daysInterval: 90 },
  { key: 'tires', label: 'Tire Rotation', emoji: '🔄', daysInterval: 180 },
  { key: 'brakes', label: 'Brake Inspection', emoji: '🛑', daysInterval: 365 },
  { key: 'air_filter', label: 'Air Filter', emoji: '💨', daysInterval: 365 },
  { key: 'cabin_filter', label: 'Cabin Filter', emoji: '🌬️', daysInterval: 365 },
  { key: 'fluids', label: 'Fluids Check', emoji: '💧', daysInterval: 180 },
]

function AddVehicleModal({ visible, onClose, onSave }) {
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')

  const handleSave = () => {
    if (!make || !model || !year) return Alert.alert('Required', 'Please enter make, model, and year.')
    onSave({ make, model, year, mileage })
    setMake(''); setModel(''); setYear(''); setMileage('')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <View style={s.modalHeader}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Add Vehicle</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: '#6b7280' }}>Cancel</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={s.fieldLabel}>Make (brand)</Text>
          <TextInput style={s.input} value={make} onChangeText={setMake} placeholder="e.g. Toyota" placeholderTextColor="#4b5563" autoCapitalize="words" />
          <Text style={s.fieldLabel}>Model</Text>
          <TextInput style={s.input} value={model} onChangeText={setModel} placeholder="e.g. Camry" placeholderTextColor="#4b5563" autoCapitalize="words" />
          <Text style={s.fieldLabel}>Year</Text>
          <TextInput style={s.input} value={year} onChangeText={setYear} placeholder="e.g. 2019" placeholderTextColor="#4b5563" keyboardType="number-pad" maxLength={4} />
          <Text style={s.fieldLabel}>Current Mileage</Text>
          <TextInput style={s.input} value={mileage} onChangeText={setMileage} placeholder="e.g. 45000" placeholderTextColor="#4b5563" keyboardType="number-pad" />
          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Add Vehicle</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

function VehicleCard({ vehicle, tasks, onTaskComplete, onSelect }) {
  const vehicleTasks = tasks.filter(t =>
    t.item?.toLowerCase().includes(vehicle.name.toLowerCase()) ||
    t.item?.toLowerCase().includes('vehicle') ||
    t.item?.toLowerCase().includes(vehicle.make?.toLowerCase() || '')
  )

  const overdue = vehicleTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length
  const dueSoon = vehicleTasks.filter(t => t.due_date && new Date(t.due_date) >= new Date() && new Date(t.due_date) <= new Date(Date.now() + 30 * 86400000)).length
  const score = Math.max(0, 100 - overdue * 20 - dueSoon * 8)
  const scoreColor = score >= 80 ? GREEN : score >= 60 ? YELLOW : RED

  return (
    <TouchableOpacity style={s.vehicleCard} onPress={() => onSelect(vehicle)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 32, marginRight: 12 }}>🚗</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.vehicleName}>{vehicle.name}</Text>
          {vehicle.mileage && (
            <Text style={s.vehicleMeta}>{parseInt(vehicle.mileage).toLocaleString()} miles</Text>
          )}
        </View>
        <View style={[s.scorePill, { backgroundColor: `${scoreColor}20`, borderColor: `${scoreColor}40` }]}>
          <Text style={{ color: scoreColor, fontWeight: '800', fontSize: 14 }}>{score}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {overdue > 0 && (
          <View style={[s.badge, { backgroundColor: `${RED}20` }]}>
            <Text style={{ color: RED, fontSize: 11, fontWeight: '700' }}>{overdue} overdue</Text>
          </View>
        )}
        {dueSoon > 0 && (
          <View style={[s.badge, { backgroundColor: `${YELLOW}20` }]}>
            <Text style={{ color: YELLOW, fontSize: 11, fontWeight: '700' }}>{dueSoon} due soon</Text>
          </View>
        )}
        {overdue === 0 && dueSoon === 0 && (
          <View style={[s.badge, { backgroundColor: `${GREEN}20` }]}>
            <Text style={{ color: GREEN, fontSize: 11, fontWeight: '700' }}>✓ Up to date</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function VehicleScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)

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
        .eq('category', 'vehicle')
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
      const taskData = data || []
      setTasks(taskData)

      // Extract unique vehicles from task items
      const vehicleMap = {}
      taskData.forEach(t => {
        if (t.item && !vehicleMap[t.item]) {
          vehicleMap[t.item] = { name: t.item, make: t.item.split(' ')[0] }
        }
      })
      setVehicles(Object.values(vehicleMap))
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  const addVehicle = async ({ make, model, year, mileage }) => {
    const vehicleName = `${year} ${make} ${model}`
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    const tasks = VEHICLE_SERVICES.map(svc => {
      const dueDate = new Date(today)
      dueDate.setDate(dueDate.getDate() + Math.floor(svc.daysInterval / 2))
      return {
        user_id: user.id,
        category: 'vehicle',
        item: vehicleName,
        task: svc.label,
        due_date: dueDate.toISOString().split('T')[0],
        recurring_days: svc.daysInterval,
        status: 'pending',
      }
    })

    await supabase.from('maintenance_tasks').insert(tasks)
    setShowAdd(false)
    load()
  }

  const completeTask = async (task) => {
    await supabase.from('maintenance_tasks').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const vehicleTasks = selectedVehicle
    ? tasks.filter(t => t.item === selectedVehicle.name)
    : []

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={s.title}>Vehicles</Text>
          <TouchableOpacity style={s.addBtnSmall} onPress={() => setShowAdd(true)}>
            <Text style={{ color: AMBER, fontWeight: '700' }}>+ Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.subtitle}>Track maintenance for all your vehicles</Text>

        {vehicles.length === 0 ? (
          <View style={[s.emptyCard]}>
            <Text style={{ fontSize: 48, marginBottom: 12, textAlign: 'center' }}>🚗</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
              No vehicles yet
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
              Add a vehicle to start tracking oil changes, tire rotations, and more.
            </Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
              <Text style={{ color: AMBER, fontWeight: '700' }}>+ Add Your First Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vehicles.map(v => (
            <VehicleCard
              key={v.name}
              vehicle={v}
              tasks={tasks}
              onTaskComplete={completeTask}
              onSelect={setSelectedVehicle}
            />
          ))
        )}

        {vehicles.length > 0 && (
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => navigation.navigate('AddTask', { category: 'vehicle' })}
          >
            <Text style={{ color: AMBER, fontWeight: '700' }}>+ Add Vehicle Task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddVehicleModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={addVehicle} />

      {/* Vehicle Detail Modal */}
      <Modal
        visible={!!selectedVehicle}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <View style={s.modalHeader}>
            <View>
              <Text style={{ fontSize: 28 }}>🚗</Text>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginTop: 4 }}>{selectedVehicle?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedVehicle(null)}>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {vehicleTasks.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>All caught up!</Text>
              </View>
            ) : (
              vehicleTasks.map(task => {
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
                setSelectedVehicle(null)
                navigation.navigate('AddTask', { category: 'vehicle', item: selectedVehicle?.name })
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
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 20 },
  vehicleCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  vehicleName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  vehicleMeta: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  addBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnSmall: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  fieldLabel: { color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: AMBER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
