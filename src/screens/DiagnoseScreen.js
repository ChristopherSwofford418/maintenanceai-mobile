import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  SafeAreaView, ScrollView, Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase, ANON_KEY, AI_PROXY_URL } from '../lib/supabase'

const BG = '#0a0f1a'
const CARD = '#0d1525'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const YELLOW = '#eab308'
const GREEN = '#22c55e'

function DIYStars({ rating }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: 14, opacity: i <= rating ? 1 : 0.25 }}>⭐</Text>
      ))}
    </View>
  )
}

export default function DiagnoseScreen({ navigation }) {
  const [photo, setPhoto] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [showConsent, setShowConsent] = useState(false)
  const [pendingSource, setPendingSource] = useState(null)

  const requestPhoto = (source) => {
    setPendingSource(source)
    setShowConsent(true)
  }

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access required.')
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      exif: false,
    })
    if (!res.canceled && res.assets?.[0]) { setPhoto(res.assets[0]); setResult(null) }
  }

  const openLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed', 'Photo library access required.')
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.4,
      base64: true,
      allowsEditing: true,
      exif: false,
    })
    if (!res.canceled && res.assets?.[0]) { setPhoto(res.assets[0]); setResult(null) }
  }

  const handleConsentAccept = () => {
    setShowConsent(false)
    if (pendingSource === 'camera') openCamera()
    else openLibrary()
  }

  const analyze = async () => {
    if (!photo?.base64) return Alert.alert('No photo', 'Take or choose a photo first.')

    // Check subscription for premium feature
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('maintenance_profiles').select('subscribed').eq('id', user.id).single()
      if (!profile?.subscribed) {
        navigation.navigate('Paywall')
        return
      }
    }

    setAnalyzing(true)
    setResult(null)
    try {
      const prompt = `You are an expert home and auto maintenance specialist with 25 years of experience. Analyze this photo and provide a detailed maintenance diagnosis.

Identify whether this is a home issue (structural, plumbing, electrical, HVAC, appliance, roof, etc.) or vehicle issue (engine, brakes, body, tires, etc.).

Provide a complete analysis as JSON:
{
  "problem": "specific problem name",
  "category": "home" or "vehicle",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "description": "2-3 sentence description of what you see",
  "cost_estimate": "e.g. $150-$400 DIY / $400-$800 professional",
  "diy_difficulty": 1-5 (1=very easy, 5=professional required),
  "hire_out": true or false (true if professional required),
  "urgency_note": "how soon this needs to be addressed",
  "fix_steps": ["step 1", "step 2", "step 3", "step 4"],
  "tools_needed": ["tool1", "tool2"],
  "prevention": "how to prevent this in the future",
  "warning_signs": "signs it's getting worse"
}

Be specific and practical. Include real cost ranges. Return ONLY valid JSON.`

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ANON_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photo.base64}`, detail: 'low' } },
            ],
          }],
          max_tokens: 900,
        }),
      })
      const data = await res.json()
      const content = (data?.content || '').replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

      try {
        const parsed = JSON.parse(content)
        setResult(parsed)
        if (user) {
          await supabase.from('maintenance_diagnoses').insert({
            user_id: user.id,
            problem: parsed.problem,
            severity: parsed.severity,
            cost_estimate: parsed.cost_estimate,
            diy_difficulty: parsed.diy_difficulty,
            fix_steps: JSON.stringify(parsed.fix_steps),
          })
        }
      } catch {
        setResult({ problem: content.substring(0, 300), severity: 'Unknown', fix_steps: [] })
      }
    } catch {
      Alert.alert('Analysis failed', 'Could not analyze the photo. Please try again.')
    }
    setAnalyzing(false)
  }

  const severityColor = (s) => {
    if (s === 'Critical') return RED
    if (s === 'High') return '#f97316'
    if (s === 'Medium') return YELLOW
    return GREEN
  }

  if (showConsent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 20 }}>🔒</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>Before we continue</Text>
        <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 12 }}>
          Your photo will be analyzed by AI to identify maintenance problems. It is not stored or shared with third parties.
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 32 }}>
          The image is sent to the AI model for analysis only and immediately discarded after processing.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: AMBER, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginBottom: 16 }}
          onPress={handleConsentAccept}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>I Understand, Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowConsent(false)}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>AI Diagnosis</Text>
        <Text style={s.subtitle}>Photo-analyze any home or vehicle problem instantly</Text>

        {photo ? (
          <View style={{ marginBottom: 20 }}>
            <Image source={{ uri: photo.uri }} style={s.previewImg} resizeMode="cover" />
            <TouchableOpacity
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 10 }}
              onPress={() => { setPhoto(null); setResult(null) }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 13 }}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 24 }}>
            <TouchableOpacity style={s.photoBtn} onPress={() => requestPhoto('camera')}>
              <Text style={{ fontSize: 24 }}>📷</Text>
              <View>
                <Text style={s.photoBtnTitle}>Take Photo</Text>
                <Text style={s.photoBtnSub}>Capture the problem area</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoBtn} onPress={() => requestPhoto('library')}>
              <Text style={{ fontSize: 24 }}>🖼️</Text>
              <View>
                <Text style={s.photoBtnTitle}>Choose from Library</Text>
                <Text style={s.photoBtnSub}>Use an existing photo</Text>
              </View>
            </TouchableOpacity>

            <View style={[s.card, { flexDirection: 'row', gap: 10, paddingVertical: 12 }]}>
              <Text style={{ fontSize: 20 }}>💡</Text>
              <Text style={{ color: '#6b7280', fontSize: 13, flex: 1, lineHeight: 18 }}>
                Works on: leaking pipes, cracks, rust, warning lights, damaged shingles, mold, worn brakes, and more.
              </Text>
            </View>
          </View>
        )}

        {photo && !result && (
          <TouchableOpacity
            style={s.analyzeBtn}
            onPress={analyze}
            disabled={analyzing}
          >
            {analyzing
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.analyzeBtnText}>Analyze Problem 🔍</Text>
            }
          </TouchableOpacity>
        )}

        {analyzing && (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
              Analyzing photo... identifying problem, severity, and repair steps.
            </Text>
          </View>
        )}

        {result && (
          <>
            <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ color: AMBER, fontSize: 13 }}>✓ Saved to your diagnosis history</Text>
            </View>

            {/* Main problem card */}
            <View style={s.card}>
              <Text style={s.cardLabel}>PROBLEM DETECTED</Text>
              <Text style={s.problemTitle}>{result.problem}</Text>
              {result.description ? (
                <Text style={{ color: '#9ca3af', fontSize: 14, lineHeight: 20, marginTop: 6 }}>{result.description}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {result.severity && (
                  <View style={[s.chip, { backgroundColor: `${severityColor(result.severity)}20` }]}>
                    <Text style={{ color: severityColor(result.severity), fontSize: 12, fontWeight: '700' }}>
                      {result.severity} Severity
                    </Text>
                  </View>
                )}
                {result.category && (
                  <View style={s.chip}>
                    <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                      {result.category === 'home' ? '🏠 Home' : '🚗 Vehicle'}
                    </Text>
                  </View>
                )}
                {result.hire_out !== undefined && (
                  <View style={[s.chip, { backgroundColor: result.hire_out ? `${RED}15` : `${GREEN}15` }]}>
                    <Text style={{ color: result.hire_out ? RED : GREEN, fontSize: 12, fontWeight: '700' }}>
                      {result.hire_out ? '👷 Hire a Pro' : '🛠️ DIY Possible'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Cost + DIY */}
            <View style={s.card}>
              <Text style={s.cardLabel}>COST ESTIMATE</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 }}>{result.cost_estimate || 'Varies'}</Text>
              {result.diy_difficulty && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <Text style={{ color: '#6b7280', fontSize: 13 }}>DIY Difficulty:</Text>
                  <DIYStars rating={result.diy_difficulty} />
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>({result.diy_difficulty}/5)</Text>
                </View>
              )}
              {result.urgency_note && (
                <Text style={{ color: YELLOW, fontSize: 13, marginTop: 10, fontStyle: 'italic' }}>
                  ⏰ {result.urgency_note}
                </Text>
              )}
            </View>

            {/* Fix Steps */}
            {result.fix_steps?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardLabel}>REPAIR STEPS</Text>
                {result.fix_steps.map((step, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <View style={s.stepNum}>
                      <Text style={{ color: AMBER, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: '#e5e7eb', fontSize: 14, flex: 1, lineHeight: 20 }}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tools */}
            {result.tools_needed?.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardLabel}>TOOLS NEEDED</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {result.tools_needed.map((t, i) => (
                    <View key={i} style={[s.chip]}>
                      <Text style={{ color: '#9ca3af', fontSize: 13 }}>🔧 {t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Prevention */}
            {result.prevention ? (
              <View style={s.card}>
                <Text style={s.cardLabel}>PREVENTION TIP</Text>
                <Text style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 20, marginTop: 4 }}>{result.prevention}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.analyzeBtn, { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' }]}
              onPress={() => { setPhoto(null); setResult(null) }}
            >
              <Text style={{ color: AMBER, fontWeight: '700', fontSize: 15 }}>Scan Another Problem 📷</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#6b7280', fontSize: 14, marginBottom: 20 },
  previewImg: { width: '100%', height: 220, borderRadius: 16 },
  photoBtn: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  photoBtnTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '600' },
  photoBtnSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  analyzeBtn: {
    backgroundColor: AMBER,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzeBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  problemTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 4 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    flexShrink: 0,
  },
})
