export const CHECKOUT_EVENT = 'questurian:journey:checkout'

/** Stripe checkout is about to open. A window event, so payments never import the tracker. */
export function markCheckout(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHECKOUT_EVENT))
}
