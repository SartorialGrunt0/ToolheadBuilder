import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for a smooth, draggable carousel.
 * Tracks drag offset in real time and snaps to the nearest item on release.
 * Works with both mouse and touch events.
 *
 * @param {number} total - Number of items in the carousel
 * @param {number} activeIndex - Currently centered item index
 * @param {function} setActiveIndex - Setter to change the centered item
 * @param {number} itemWidth - Approximate width of one item (used for snap calculations)
 * @returns {{ dragOffset, isDragging, handlers }}
 */
export function useDragCarousel(total, activeIndex, setActiveIndex, itemWidth = 460) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentOffset = useRef(0);
  const dragging = useRef(false);
  const isHorizontalSwipe = useRef(null);

  const handleStart = useCallback((clientX, clientY) => {
    startX.current = clientX;
    startY.current = clientY;
    currentOffset.current = 0;
    dragging.current = true;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  }, []);

  const handleMove = useCallback((clientX, clientY) => {
    if (!dragging.current) return;
    const dx = clientX - startX.current;
    const dy = clientY - startY.current;

    // Determine direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
    }

    // Only track horizontal drags
    if (isHorizontalSwipe.current) {
      currentOffset.current = dx;
      setDragOffset(dx);
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);

    const offset = currentOffset.current;
    const threshold = itemWidth * 0.08; // 8% of item width to trigger snap (high sensitivity)

    if (Math.abs(offset) > threshold && total > 1) {
      // Calculate how many items to skip based on drag distance
      const itemsToSkip = Math.max(1, Math.round(Math.abs(offset) / (itemWidth * 0.35)));
      if (offset < 0) {
        // Dragged left → go right (next)
        setActiveIndex((prev) => (prev + itemsToSkip) % total);
      } else {
        // Dragged right → go left (prev)
        setActiveIndex((prev) => (prev - itemsToSkip + total) % total);
      }
    }

    setDragOffset(0);
    currentOffset.current = 0;
    isHorizontalSwipe.current = null;
  }, [total, setActiveIndex, itemWidth]);

  // Mouse handlers
  const onMouseDown = useCallback((e) => {
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const onMouseMove = useCallback((e) => {
    if (dragging.current) {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    }
  }, [handleMove]);

  const onMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch handlers
  const onTouchStart = useCallback((e) => {
    const touch = e.touches?.[0];
    if (touch) handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e) => {
    const touch = e.touches?.[0];
    if (touch) handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Global mouse listeners for drag outside carousel bounds
  useEffect(() => {
    if (!isDragging) return;
    const moveHandler = (e) => {
      if (dragging.current) {
        e.preventDefault();
        handleMove(e.clientX, e.clientY);
      }
    };
    const upHandler = () => handleEnd();
    window.addEventListener('mousemove', moveHandler, { passive: false });
    window.addEventListener('mouseup', upHandler);
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };
  }, [isDragging, handleMove, handleEnd]);

  const handlers = {
    onMouseDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  return { dragOffset, isDragging, handlers };
}
