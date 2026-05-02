import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

/** Resolves to null if no publishable key is configured — UI falls back to mock flow */
export const stripePromise =
  publishableKey && publishableKey !== 'pk_test_placeholder'
    ? loadStripe(publishableKey)
    : Promise.resolve(null)
