const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string) => console.log(`[${timestamp()}] INFO: ${message}`),
  warn: (message: string) => console.warn(`[${timestamp()}] WARN: ${message}`),
  error: (message: string) => console.error(`[${timestamp()}] ERROR: ${message}`),
};
