/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';

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

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('shippingAddress', JSON.stringify(shippingAddress));
  }, [shippingAddress]);

  const addToCart = (product, qty) => {
    setCartItems(prev => {
      const existItem = prev.find(x => x.product === product._id);
      if (existItem) {
        return prev.map(x => 
          x.product === existItem.product 
            ? { ...x, qty } // Replace old qty with new qty
            : x
        );
      } else {
        return [...prev, {
          product: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          countInStock: product.countInStock,
          qty
        }];
      }
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(x => x.product !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const saveShippingAddress = (data) => {
    setShippingAddress(data);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, shippingAddress, saveShippingAddress }}>
      {children}
    </CartContext.Provider>
  );
};
