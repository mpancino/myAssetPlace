/**
 * Logger Utility
 * 
 * This utility provides standardized logging functions for consistent
 * debugging throughout the application.
 */

// Environment check - only log in development mode when not in production
const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

// Enable/disable specific log levels
// These could be controlled via user settings or environment
const enabledLevels: Record<LogLevel, boolean> = {
  info: isDev,
  warn: true, // Always log warnings
  error: true, // Always log errors
  debug: isDev,
};

// Component tags for better organization
export type LogComponent = 
  'form' | 
  'asset' | 
  'auth' | 
  'api' | 
  'expense' | 
  'navigation' | 
  'subscription' | 
  'dashboard' | 
  'projection' | 
  'system';

/**
 * Create formatted log message with component tag
 */
const formatMessage = (component: LogComponent, message: string): string => {
  return `[${component.toUpperCase()}] ${message}`;
};

/**
 * Log information message
 */
export const logInfo = (component: LogComponent, message: string, ...data: any[]): void => {
  if (enabledLevels.info) {
    console.log(formatMessage(component, message), ...data);
  }
};

/**
 * Log warning message
 */
export const logWarn = (component: LogComponent, message: string, ...data: any[]): void => {
  if (enabledLevels.warn) {
    console.warn(formatMessage(component, message), ...data);
  }
};

/**
 * Log error message
 */
export const logError = (component: LogComponent, message: string, ...data: any[]): void => {
  if (enabledLevels.error) {
    console.error(formatMessage(component, message), ...data);
  }
};

/**
 * Log debug message
 */
export const logDebug = (component: LogComponent, message: string, ...data: any[]): void => {
  if (enabledLevels.debug) {
    console.debug(formatMessage(component, message), ...data);
  }
};

/**
 * Default logger object with all methods
 */
const logger = {
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
};

export default logger;