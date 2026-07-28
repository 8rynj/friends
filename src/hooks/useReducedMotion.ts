/**
 * Reports the OS "reduce motion" accessibility setting so animations can be
 * disabled per Design Guidelines §7 ("always respect prefers-reduced-motion").
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (value) => setReduced(value),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
