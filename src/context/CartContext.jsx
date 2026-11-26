import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as store from '../api/store';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

/**
 * The cart always mirrors the real WooCommerce cart returned by the Store API.
 * Every action sends a request and then replaces local state with the
 * server's response - nothing is calculated or faked in the browser.
 */
export function CartProvider({ children }) {
  const toast = useToast();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(0); // number of cart requests in flight

  const refresh = useCallback(async () => {
    try {
      const next = await store.getCart();
      setCart(next);
      setError(null);
      return next;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Runs a cart request, tracks "busy" state and stores the returned cart.
  const run = useCallback(async (action) => {
    setPending((n) => n + 1);
    try {
      const next = await action();
      setCart(next);
      setError(null);
      return next;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  const addToCart = useCallback(
    async ({ id, quantity = 1, variation = [], name }) => {
      try {
        await run(() => store.addToCart({ id, quantity, variation }));
        toast.success(name ? `“${name}” added to your cart` : 'Added to your cart');
        return true;
      } catch (err) {
        toast.error(err.message);
        return false;
      }
    },
    [run, toast]
  );

  const updateQuantity = useCallback(
    async (key, quantity) => {
      try {
        await run(() => store.updateCartItem(key, quantity));
      } catch (err) {
        toast.error(err.message);
        refresh();
      }
    },
    [run, toast, refresh]
  );

  const removeItem = useCallback(
    async (key) => {
      try {
        await run(() => store.removeCartItem(key));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [run, toast]
  );

  const applyCoupon = useCallback(
    async (code) => {
      await run(() => store.applyCoupon(code)); // errors are shown by the caller
      toast.success('Coupon applied');
    },
    [run, toast]
  );

  const removeCoupon = useCallback(
    async (code) => {
      try {
        await run(() => store.removeCoupon(code));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [run, toast]
  );

  const selectShipping = useCallback(
    (packageId, rateId) => run(() => store.selectShippingRate(packageId, rateId)),
    [run]
  );

  const updateCustomer = useCallback((data) => run(() => store.updateCustomer(data)), [run]);

  const value = useMemo(
    () => ({
      cart,
      loading,
      error,
      busy: pending > 0,
      itemCount: cart?.items_count ?? 0,
      refresh,
      addToCart,
      updateQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      selectShipping,
      updateCustomer,
    }),
    [
      cart,
      loading,
      error,
      pending,
      refresh,
      addToCart,
      updateQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      selectShipping,
      updateCustomer,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
