import { useEffect, useRef } from 'react';

/** Always renders the final financial value; motion never invents intermediate amounts. */
export function AnimatedValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    const element = ref.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element?.animate || preference.matches) return;
    const animation = element.animate(
      [
        { opacity: 0.65, filter: 'blur(2px)' },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
    const stop = () => {
      if (preference.matches) animation.cancel();
    };
    preference.addEventListener('change', stop);
    return () => {
      animation.cancel();
      preference.removeEventListener('change', stop);
    };
  }, [value]);
  return (
    <span ref={ref} className="dashboard-animated-value">
      {value}
    </span>
  );
}
