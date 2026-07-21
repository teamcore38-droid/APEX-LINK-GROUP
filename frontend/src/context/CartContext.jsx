/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { getMarketingSessionId, trackEvent } from '../utils/analytics';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const localData = localStorage.getItem('cartItems');
    return localData ? JSON.parse(localData) : [];
  });
  
  const [shippingAddress, setShippingAddress] = useState(() => {
    const localData = localStorage.getItem('shippingAddress');
    return localData ? JSON.parse(localData) : {};
  });

  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    return localStorage.getItem('selectedDistrict') || '';
  });

  const [districtShippingFee, setDistrictShippingFee] = useState(() => {
    const saved = localStorage.getItem('districtShippingFee');
    return saved ? Number(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));

    if (cartItems.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const subtotal = cartItems.reduce((total, item) => total + Number(item.price || 0) * Number(item.qty || 0), 0);

      axios
        .post(
          '/api/marketing/abandoned-cart',
          {
            sessionId: getMarketingSessionId(),
            items: cartItems,
            subtotal,
            currency: 'LKR',
            checkoutUrl: `${window.location.origin}/checkout`,
          },
          {
            headers: { 'x-session-id': getMarketingSessionId() },
          }
        )
        .catch((error) => {
          if (import.meta.env.DEV) console.error(error);
        });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
  }, [shippingAddress]);

  useEffect(() => {
    localStorage.setItem('selectedDistrict', selectedDistrict);
  }, [selectedDistrict]);

  useEffect(() => {
    localStorage.setItem('districtShippingFee', String(districtShippingFee));
  }, [districtShippingFee]);

  const addToCart = useCallback((product, qty) => {
    trackEvent('add_to_cart', {
      productId: product._id || product.product,
      name: product.name,
      price: product.price,
      quantity: qty,
      variantId: product.variantId || '',
      value: Number(product.price || 0) * Number(qty || 0),
      currency: 'LKR',
    });

    setCartItems(prev => {
      const productId = product._id || product.product;
      const variantId = product.variantId || '';
      const size = product.size || '';
      const color = product.color || '';
      const existItem = prev.find(x => x.product === productId && (x.variantId || '') === variantId && (x.size || '') === size && (x.color || '') === color);
      if (existItem) {
        return prev.map(x => 
          x.product === existItem.product && (x.variantId || '') === variantId && (x.size || '') === size && (x.color || '') === color
            ? { ...x, qty } // Replace old qty with new qty
            : x
        );
      } else {
        return [...prev, {
          product: productId,
          name: product.name,
          image: product.image,
          price: product.price,
          variantId,
          variantLabel: product.variantLabel || '',
          size,
          color,
          sku: product.sku || '',
          countInStock: product.countInStock,
          qty
        }];
      }
    });
  }, []);

  const removeFromCart = useCallback((targetItem) => {
    const targetProductId = typeof targetItem === 'object' ? targetItem.product : targetItem;
    const targetVariantId = typeof targetItem === 'object' ? targetItem.variantId || '' : '';
    const targetSize = typeof targetItem === 'object' ? targetItem.size || '' : '';
    const targetColor = typeof targetItem === 'object' ? targetItem.color || '' : '';
    const item = cartItems.find((cartItem) =>
      cartItem.product === targetProductId &&
        (typeof targetItem !== 'object' ||
          ((cartItem.variantId || '') === targetVariantId &&
            (cartItem.size || '') === targetSize &&
            (cartItem.color || '') === targetColor))
    );
    if (item) {
      trackEvent('remove_from_cart', {
        productId: item.product,
        name: item.name,
        value: Number(item.price || 0) * Number(item.qty || 0),
        currency: 'LKR',
      });
    }

    setCartItems(prev => prev.filter((cartItem) => {
      if (cartItem.product !== targetProductId) {
        return true;
      }

      if (typeof targetItem !== 'object') {
        return false;
      }

      return (
        (cartItem.variantId || '') !== targetVariantId ||
        (cartItem.size || '') !== targetSize ||
        (cartItem.color || '') !== targetColor
      );
    }));
  }, [cartItems]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const saveShippingAddress = useCallback((data) => {
    setShippingAddress(data);
  }, []);

  const saveDistrict = useCallback((district, fee) => {
    setSelectedDistrict(district);
    setDistrictShippingFee(fee);
  }, []);

  const contextValue = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      shippingAddress,
      saveShippingAddress,
      selectedDistrict,
      districtShippingFee,
      saveDistrict,
    }),
    [
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      shippingAddress,
      saveShippingAddress,
      selectedDistrict,
      districtShippingFee,
      saveDistrict,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
