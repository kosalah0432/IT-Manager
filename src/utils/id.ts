export const generateId = () => {
  try {
    // Use self as it works in both window and worker contexts
    const cryptoObj = (typeof self !== 'undefined' ? self.crypto : null) || (typeof window !== 'undefined' ? window.crypto : null);
    
    if (cryptoObj) {
      // Check if randomUUID is available and is a function
      if (typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
      }
      
      // Fallback to getRandomValues if randomUUID is not available
      if (typeof cryptoObj.getRandomValues === 'function') {
        const array = new Uint32Array(4);
        cryptoObj.getRandomValues(array);
        return Array.from(array, dec => dec.toString(16).padStart(8, '0')).join('-');
      }
    }
  } catch (e) {
    // Silently fail and use Math.random fallback
  }

  // Final fallback: A simple UUID-like string generation using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
