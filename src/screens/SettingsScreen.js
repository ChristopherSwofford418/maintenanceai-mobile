import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, Alert, Linking,
  SafeAreaView, ActivityIndicator, Modal, TextInput,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase, ANON_KEY } from '../lib/supabase'
import { getAvailablePurchases } from 'react-native-iap'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showContact, setShowContact] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useFocusEffect(useCallback(() => { load() }, []))

  const load = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      if (u) {
        const { data } = await supabase.from('maintenance_profiles').select('*').eq('id', u.id).single()
        setProfile(data)
      }
    } catch {}
  }

  const handleRestore = async () => {
    try {
      const purchases = await getAvailablePurchases()
      if (purchases?.length > 0) {
        await supabase.from('maintenance_profiles').update({ subscribed: true }).eq('id', user.id)
        Alert.alert('Restored', 'Purchases restored successfully.')
        load()
      } else {
        Alert.alert('No Purchases', 'No previous purchases found.')
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases.')
    }
  }

  const handleSignOut = () => Alert.alert('Sign Out', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: async () => {
      await supabase.auth.signOut()
      navigation.replace('Onboarding')
    }},
  ])

  const handleDelete = () => Alert.alert('Delete Account', 'This will permanently delete your account and all data.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Are you sure?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Delete Everything', style: 'destructive', onPress: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          // Delete all user data
          await supabase.from('maintenance_tasks').delete().eq('user_id', user.id)
          await supabase.from('maintenance_diagnoses').delete().eq('user_id', user.id)
          await supabase.from('maintenance_profiles').delete().eq('id', user.id)
          await supabase.auth.signOut()
          navigation.replace('Onboarding')
        } catch {
          Alert.alert('Error', 'Could not delete account. Contact info@maintenanceai.io')
        }
      }},
    ])},
  ])

  const sendMessage = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch('https://xxkpvnokhqbpbqefegxa.supabase.co/functions/v1/resumefix-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          name: user?.email || 'MaintenanceAI User',
          email: user?.email || '',
          subject: 'MaintenanceAI Support',
          message,
          source: 'maintenanceai_mobile',
        }),
      })
      Alert.alert('Sent ✓', 'We\'ll get back to you within 24 hours.')
      setMessage('')
      setShowContact(false)
    } catch {
      Alert.alert('Error', 'Could not send. Email info@maintenanceai.io')
    }
    setSending(false)
  }

  const initials = user?.email?.[0]?.toUpperCase() || '?'

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Settings</Text>

          {/* Profile card */}
          <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
            <View style={s.avatar}>
              <Text style={{ color: AMBER, fontWeight: '900', fontSize: 22 }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{profile?.name || 'User'}</Text>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>{user?.email}</Text>
              {profile?.home_type && (
                <Text style={{ color: '#374151', fontSize: 12, marginTop: 2 }}>
                  {profile.home_type} · {profile.vehicles || 0} vehicle{profile.vehicles !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Subscription */}
          <Text style={s.sectionLabel}>Plan</Text>
          <View style={s.card}>
            {profile?.subscribed ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 20 }}>🔧</Text>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>MaintenanceAI Pro</Text>
                  <View style={{ backgroundColor: `${AMBER}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: `${AMBER}40` }}>
                    <Text style={{ color: AMBER, fontSize: 11, fontWeight: '700' }}>ACTIVE</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.outlineBtn}
                  onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                >
                  <Text style={{ color: AMBER, fontWeight: '700' }}>Manage Subscription</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 12 }}>
                  Free Plan — 3 task limit, no AI diagnosis
                </Text>
                <TouchableOpacity
                  style={s.upgradeBtn}
                  onPress={() => navigation.navigate('Paywall')}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>🔓 Upgrade to Pro — $4.99/mo</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[s.outlineBtn, { marginTop: 8, borderColor: 'rgba(255,255,255,0.06)' }]} onPress={handleRestore}>
              <Text style={{ color: '#9ca3af' }}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>

          {/* Support */}
          <Text style={s.sectionLabel}>Support</Text>
          <View style={s.card}>
            {[
              { label: 'Contact Support', onPress: () => setShowContact(true) },
              { label: 'Privacy Policy', onPress: () => Linking.openURL('https://maintenanceai.io/privacy') },
              { label: 'Terms of Service', onPress: () => Linking.openURL('https://maintenanceai.io/terms') },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                style={s.menuRow(i, arr)}
              >
                <Text style={{ color: '#e5e7eb', fontSize: 14 }}>{item.label}</Text>
                <Text style={{ color: '#4b5563', fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* App info */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#374151', fontSize: 12 }}>MaintenanceAI v1.0.0</Text>
          </View>

          <TouchableOpacity
            style={{ borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
            onPress={handleSignOut}
          >
            <Text style={{ color: '#ef4444', fontWeight: '700' }}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={handleDelete}>
            <Text style={{ color: '#4b5563', fontSize: 13, textDecorationLine: 'underline' }}>Delete Account</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Contact Modal */}
      <Modal visible={showContact} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowContact(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>Contact Support</Text>
            <TouchableOpacity onPress={() => setShowContact(false)}>
              <Text style={{ color: '#6b7280' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <TextInput
              style={{ backgroundColor: CARD, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 120, marginBottom: 20 }}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue..."
              placeholderTextColor="#4b5563"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={sending || !message.trim()}
              style={{ backgroundColor: message.trim() ? AMBER : '#1f2937', borderRadius: 12, padding: 16, alignItems: 'center' }}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Send Message</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  )
}

const s = {
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 20 },
  sectionLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginTop: 8 },
  card: {
    backgroundColor: '#0d1525',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  upgradeBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  menuRow: (i, arr) => ({
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 14,
    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  }),
}
