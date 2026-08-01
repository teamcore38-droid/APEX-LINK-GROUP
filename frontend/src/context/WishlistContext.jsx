/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createWishlistItem,
  getWishlistProductId,
  localWishlistRepository,
} from '../utils/wishlistStorage';

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error('useWishlist must be used inside WishlistProvider');
  }

  return context;
};

export const WishlistProvider = ({ children, repository = localWishlistRepository }) => {
  const [wishlistItems, setWishlistItems] = useState(() => repository.load());

  useEffect(() => {
    repository.save(wishlistItems);
  }, [repository, wishlistItems]);

  useEffect(() => repository.subscribe?.(setWishlistItems), [repository]);

  const wishlistProductIds = useMemo(
    () => new Set(wishlistItems.map((item) => getWishlistProductId(item))),
    [wishlistItems]
  );

  const addToWishlist = useCallback((product) => {
    const item = createWishlistItem(product);

    if (!item) {
      return;
    }

    setWishlistItems((currentItems) => [
      item,
      ...currentItems.filter((currentItem) => getWishlistProductId(currentItem) !== item._id),
    ]);
  }, []);

  const removeFromWishlist = useCallback((productOrId) => {
    const productId =
      typeof productOrId === 'object'
        ? getWishlistProductId(productOrId)
        : String(productOrId || '').trim();

    setWishlistItems((currentItems) =>
      currentItems.filter((item) => getWishlistProductId(item) !== productId)
    );
  }, []);

  const toggleWishlist = useCallback((product) => {
    const item = createWishlistItem(product);

    if (!item) {
      return;
    }

    setWishlistItems((currentItems) => {
      const alreadySaved = currentItems.some(
        (currentItem) => getWishlistProductId(currentItem) === item._id
      );

      return alreadySaved
        ? currentItems.filter((currentItem) => getWishlistProductId(currentItem) !== item._id)
        : [item, ...currentItems];
    });
  }, []);

  const isInWishlist = useCallback(
    (productOrId) => {
      const productId =
        typeof productOrId === 'object'
          ? getWishlistProductId(productOrId)
          : String(productOrId || '').trim();
      return wishlistProductIds.has(productId);
    },
    [wishlistProductIds]
  );

  const contextValue = useMemo(
    () => ({
      wishlistItems,
      wishlistCount: wishlistItems.length,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
    }),
    [
      wishlistItems,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
    ]
  );

  return <WishlistContext.Provider value={contextValue}>{children}</WishlistContext.Provider>;
};
