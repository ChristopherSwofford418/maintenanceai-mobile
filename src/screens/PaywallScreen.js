import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native'
import { connectIAP, disconnectIAP, getProducts, purchaseProduct, setPurchaseListener, PRODUCT_IDS } from '../lib/iap'
import { getAvailablePurchases } from 'react-native-iap'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'

const FEATURES = [
  { emoji: '🔧', title: 'Unlimited Tasks', desc: 'Track every home system and vehicle without limits' },
  { emoji: '📷', title: 'AI Photo Diagnosis', desc: 'Identify problems and get repair steps from any photo' },
  { emoji: '💰', title: 'Cost Estimates', desc: 'Know if it\'s DIY-able before calling a contractor' },
  { emoji: '📋', title: 'Full History', desc: 'Access your complete maintenance log and all diagnoses' },
  { emoji: '🤖', title: 'Smart Scheduling', desc: 'AI-generated maintenance plans tailored to your home & cars' },
  { emoji: '⚡', title: 'Predictive Alerts', desc: 'Get warned before things break, not after' },
]

export default function PaywallScreen({ navigation }) {
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [price, setPrice] = useState('$4.99')

  useEffect(() => {
    setup()
    return () => { disconnectIAP() }
  }, [])

  const setup = async () => {
    try {
      await connectIAP()
      const products = await getProducts()
      if (products.length > 0) setPrice(products[0].localizedPrice || '$4.99')
    } catch {}
    setLoading(false)
  }

  const handlePurchase = async () => {
    setPurchasing(true)
    try {
      await setPurchaseListener(
        () => {
          setPurchasing(false)
          Alert.alert(
            '🔧 Welcome to MaintenanceAI Pro!',
            'Unlimited tasks, AI diagnosis, and full history unlocked!',
            [{ text: 'Let\'s Go!', onPress: () => navigation.replace('Main') }]
          )
        },
        (code) => {
          setPurchasing(false)
          if (code !== 'E_USER_CANCELLED') Alert.alert('Purchase Failed', 'Please try again.')
        }
      )
      await purchaseProduct(PRODUCT_IDS.MONTHLY)
    } catch {
      setPurchasing(false)
    }
  }

  const handleRestore = async () => {
    try {
      const purchases = await getAvailablePurchases()
      if (purchases?.length > 0) {
        Alert.alert('Restored!', 'Purchases restored successfully.', [
          { text: 'Continue', onPress: () => navigation.replace('Main') }
        ])
      } else {
        Alert.alert('No Purchases', 'No previous purchases found.')
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases.')
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Close button */}
        <TouchableOpacity
          style={{ alignSelf: 'flex-end', marginBottom: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#4b5563', fontSize: 14 }}>✕</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 64, textAlign: 'center', marginBottom: 12 }}>🔧</Text>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 6 }}>
          MaintenanceAI Pro
        </Text>
        <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 }}>
          Your AI home & vehicle maintenance expert. Prevent expensive repairs before they happen.
        </Text>

        {/* Features */}
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          {FEATURES.map((f, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: i < FEATURES.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)', gap: 12 }}>
              <Text style={{ fontSize: 20, width: 28 }}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{f.title}</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{f.desc}</Text>
              </View>
              <Text style={{ color: AMBER, fontSize: 16 }}>✓</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={{
          backgroundColor: 'rgba(245,158,11,0.1)',
          borderWidth: 2,
          borderColor: AMBER,
          borderRadius: 20,
          padding: 20,
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <View style={{ backgroundColor: AMBER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>7-DAY FREE TRIAL</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900' }}>{price}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>per month · cancel anytime</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={AMBER} style={{ marginBottom: 16 }} />
        ) : (
          <TouchableOpacity
            style={{ backgroundColor: AMBER, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12 }}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>
                  Start 7-Day Free Trial
                </Text>
            }
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleRestore} style={{ paddingVertical: 12, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#6b7280', fontSize: 13 }}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={{ color: '#374151', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 8 }}>
          Payment charged to Apple ID after 7-day trial. Subscription auto-renews unless cancelled 24 hours before period end. Manage or cancel in App Store settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
