import { useRef, useCallback } from 'react';

/**
 * Custom hook for detecting horizontal swipe gestures on touch devices.
 * Only triggers when the horizontal movement exceeds the vertical movement
 * and a minimum threshold, to avoid interfering with vertical scrolling.
 */
export function useSwipe(onSwipeLeft, onSwipeRight, threshold = 50) {
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const touch = e.changedTouches?.[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX < 0) {
          onSwipeLeft();
        } else {
          onSwipeRight();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
