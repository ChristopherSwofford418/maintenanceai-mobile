# MaintenanceAI 🔧

> AI-powered home & vehicle maintenance tracking. Predicts problems before they break.

## What Makes This Different

Most maintenance apps are passive trackers. MaintenanceAI is **proactive**:

- **AI Photo Diagnosis** — point your camera at any problem; get severity, cost, and repair steps
- **Predictive Scheduling** — AI generates a full maintenance plan based on your home age and vehicle history
- **Combined Home + Auto** — one app for everything (gap the competition misses)
- **Cost Intelligence** — know DIY vs hire-out before touching a thing
- **Usage-Based Reminders** — not just calendar alerts, but reminders tied to actual conditions

## Market Research Findings

**Home maintenance apps (HomeZada, Centriq, Thumbtack):**
- Too manual — users must enter everything themselves
- No AI photo diagnosis
- Don't combine home + vehicle
- Thumbtack/Angi are contractor marketplaces, not maintenance trackers

**Auto maintenance apps (Drivvo, Fuelly, CARFAX Car Care):**
- Vehicle-only (no home)
- Calendar-based, not AI-predictive
- No photo-based diagnosis
- CARFAX needs VIN lookup, friction-heavy onboarding

**Reddit complaints (r/homeowners, r/personalfinance):**
- "I didn't know the water heater needed annual flushing until it failed"
- "Nobody told me HVAC filters needed monthly changes"
- "I spent $4k on a furnace because I ignored warning signs for 2 years"
- "I wish there was one app for my house AND my cars"

**The Gap:** No app combines home + vehicle tracking with proactive AI diagnosis. **That's our moat.**

## Tech Stack

- React Native + Expo SDK 54
- Supabase (auth + database)
- OpenAI GPT-4o via AI proxy (photo diagnosis)
- react-native-iap v15 (subscriptions)

## Screens

| Screen | Description |
|--------|-------------|
| Onboarding | Welcome → Auth → Home type → Year + vehicles → Name → AI schedule generation |
| Dashboard | Health scores, overdue/due soon/upcoming tasks |
| Home | 8 home systems with health scores and task drill-down |
| Vehicles | Add vehicles, track oil/tires/brakes/filters per vehicle |
| Diagnose | Photo → AI → problem + severity + cost + repair steps |
| Add Task | Category, item, task, due date, recurring interval |
| History | Completed tasks + AI diagnoses log |
| Paywall | $4.99/mo, 7-day trial, 6 Pro features |
| Settings | Profile, subscription, support, legal |

## Supabase Setup

Run `SUPABASE_SETUP.sql` in the Supabase SQL editor.

## Build

```bash
npm install
npx expo start
```

For production:
```bash
eas build --platform ios
eas submit --platform ios
```

## IAP Product

Product ID: `io.maintenanceai.app.monthly`
Price: $4.99/month
Trial: 7 days free

## Free vs Pro

| Feature | Free | Pro |
|---------|------|-----|
| Tasks | Up to 3 | Unlimited |
| AI Photo Diagnosis | ❌ | ✅ |
| Cost Estimates | ❌ | ✅ |
| Maintenance History | Limited | Full |
| AI Schedule Generation | ✅ | ✅ |
| Dashboard & Scores | ✅ | ✅ |
