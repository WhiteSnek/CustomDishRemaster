export const generateCorrelationId = () => {
    return Math.random().toString(36).substring(7) + Date.now().toString();
  }