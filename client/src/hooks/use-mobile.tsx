import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the current viewport is mobile-sized
 * Returns true if viewport width is less than 768px (md breakpoint in Tailwind)
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    // Set up event listener to update state on resize
    window.addEventListener('resize', handleResize);
    
    // Initial check
    handleResize();
    
    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

export { useIsMobile };