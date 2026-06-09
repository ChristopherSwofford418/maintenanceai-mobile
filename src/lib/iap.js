/**
 * MaintenanceAI In-App Purchase
 * Uses react-native-iap v15 for StoreKit (iOS) and Google Play Billing (Android)
 */
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  clearTransactionIOS,
  getAvailablePurchases,
} from 'react-native-iap'
import { Platform } from 'react-native'
import { supabase } from './supabase'

export const PRODUCT_IDS = {
  MONTHLY: 'io.maintenanceai.app.monthly',
}

let purchaseUpdateSub = null
let purchaseErrorSub = null

export async function connectIAP() {
  try {
    await initConnection()
    if (Platform.OS === 'ios') {
      await clearTransactionIOS()
    }
  } catch (e) {
    console.warn('IAP connect error:', e)
  }
}

export async function disconnectIAP() {
  try {
    if (purchaseUpdateSub) { purchaseUpdateSub.remove(); purchaseUpdateSub = null }
    if (purchaseErrorSub) { purchaseErrorSub.remove(); purchaseErrorSub = null }
    await endConnection()
  } catch {}
}

export async function getProducts() {
  try {
    const products = await getSubscriptions({ skus: Object.values(PRODUCT_IDS) })
    return products || []
  } catch (e) {
    console.warn('getProducts error:', e)
    return []
  }
}

export async function checkExistingSubscription() {
  try {
    const purchases = await getAvailablePurchases()
    return purchases.some(p => Object.values(PRODUCT_IDS).includes(p.productId))
  } catch {
    return false
  }
}

export async function purchaseProduct(productId) {
  if (Platform.OS === 'android') {
    await requestSubscription({ sku: productId })
  } else {
    await requestSubscription({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false })
  }
}

export async function setPurchaseListener(onSuccess, onError) {
  if (purchaseUpdateSub) purchaseUpdateSub.remove()
  if (purchaseErrorSub) purchaseErrorSub.remove()

  purchaseUpdateSub = purchaseUpdatedListener(async (purchase) => {
    const receipt = purchase.transactionReceipt
    if (receipt) {
      try {
        await finishTransaction({ purchase, isConsumable: false })
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('maintenance_profiles').update({
            subscribed: true,
          }).eq('id', user.id)
        }
        onSuccess(purchase)
      } catch (e) {
        console.warn('finishTransaction error:', e)
        onError && onError(e.code)
      }
    }
  })

  purchaseErrorSub = purchaseErrorListener((error) => {
    if (error.code !== 'E_USER_CANCELLED') {
      onError && onError(error.code)
    }
  })
}
