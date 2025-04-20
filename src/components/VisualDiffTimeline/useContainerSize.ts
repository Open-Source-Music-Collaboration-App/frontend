// src/hooks/useContainerSize.ts
import { useRef, useState, useEffect } from "react";

/**
 * Custom hook that measures a <div>'s width/height with getBoundingClientRect().
 * It re-measures every time the window resizes.
 */
export function useContainerSize() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }

    // Measure once initially
    handleResize();

    // Remeasure on window resize
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { containerRef, size };
}
