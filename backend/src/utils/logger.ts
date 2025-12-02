const log = (level: string, message: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args);
};

export const logger = {
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  error: (message: string, ...args: any[]) => log('error', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      log('debug', message, ...args);
    }
  },
};

