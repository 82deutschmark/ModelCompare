/**
 * Configuration Management System
 * 
 * Centralized configuration with environment-aware defaults and validation.
 * Provides type-safe access to all application settings.
 * 
 * Author: Claude Code
 * Date: 2025-08-26
 */

export interface DatabaseConfig {
  url?: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
  corsOrigins: string[];
  jsonSizeLimit: string;
  enableLegacyRoutes: boolean;
}

export interface TemplateConfig {
  docsPath: string;
  validateAtStartup: boolean;
  cacheTemplates: boolean;
  compilationTimeout: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableContextLogging: boolean;
  enableRequestTracing: boolean;
  healthCheckLogging: boolean;
}

export interface SecurityConfig {
  enableHelmet: boolean;
  enableCors: boolean;
  cspDirectives: Record<string, string[]>;
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  templates: TemplateConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  circuitBreaker: CircuitBreakerConfig;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): AppConfig {
  const environment = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isProduction = environment === 'production';
  const isDevelopment = environment === 'development';

  return {
    server: {
      port: parseInt(process.env.PORT || '5000', 10),
      host: isDevelopment ? 'localhost' : '0.0.0.0',
      environment,
      corsOrigins: isProduction 
        ? (process.env.CORS_ORIGINS || 'http://localhost:5000').split(',')
        : ['*'],
      jsonSizeLimit: process.env.JSON_SIZE_LIMIT || '10mb',
      enableLegacyRoutes: process.env.ENABLE_LEGACY_ROUTES !== 'false'
    },

    database: {
      url: process.env.DATABASE_URL,
      ssl: isProduction,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
      idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10)
    },

    templates: {
      docsPath: process.env.TEMPLATES_PATH || './client/public/docs',
      validateAtStartup: process.env.VALIDATE_TEMPLATES_AT_STARTUP !== 'false',
      cacheTemplates: process.env.CACHE_TEMPLATES !== 'false',
      compilationTimeout: parseInt(process.env.TEMPLATE_COMPILATION_TIMEOUT || '10000', 10)
    },

    logging: {
      level: (process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')) as 'debug' | 'info' | 'warn' | 'error',
      enableContextLogging: process.env.ENABLE_CONTEXT_LOGGING !== 'false',
      enableRequestTracing: process.env.ENABLE_REQUEST_TRACING !== 'false',
      healthCheckLogging: process.env.HEALTH_CHECK_LOGGING === 'true'
    },

    security: {
      enableHelmet: process.env.ENABLE_HELMET !== 'false',
      enableCors: process.env.ENABLE_CORS !== 'false',
      cspDirectives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : [])],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", ...(isDevelopment ? ["ws:", "wss:"] : [])],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      },
      rateLimiting: {
        enabled: process.env.ENABLE_RATE_LIMITING === 'true', // Disabled by default for hobby project
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
      }
    },

    circuitBreaker: {
      failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '3', 10),
      recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '30000', 10),
      monitoringPeriod: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_PERIOD || '60000', 10)
    }
  };
}

/**
 * Validate configuration and throw descriptive errors for invalid settings
 */
export function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Server validation
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push(`Invalid port: ${config.server.port}. Must be between 1 and 65535.`);
  }

  if (!['development', 'production', 'test'].includes(config.server.environment)) {
    errors.push(`Invalid environment: ${config.server.environment}. Must be development, production, or test.`);
  }

  // Database validation
  if (config.database.maxConnections < 1 || config.database.maxConnections > 100) {
    errors.push(`Invalid max connections: ${config.database.maxConnections}. Must be between 1 and 100.`);
  }

  // Circuit breaker validation
  if (config.circuitBreaker.failureThreshold < 1 || config.circuitBreaker.failureThreshold > 20) {
    errors.push(`Invalid failure threshold: ${config.circuitBreaker.failureThreshold}. Must be between 1 and 20.`);
  }

  if (config.circuitBreaker.recoveryTimeout < 1000 || config.circuitBreaker.recoveryTimeout > 300000) {
    errors.push(`Invalid recovery timeout: ${config.circuitBreaker.recoveryTimeout}. Must be between 1000ms and 300000ms.`);
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

// Validate configuration at module load time
validateConfig(config);

/**
 * Helper functions for common config access patterns
 */
export const isDevelopment = () => config.server.environment === 'development';
export const isProduction = () => config.server.environment === 'production';
export const isTest = () => config.server.environment === 'test';

/**
 * Get database configuration
 */
export const getDatabaseConfig = () => config.database;

/**
 * Get server configuration
 */
export const getServerConfig = () => config.server;

/**
 * Get template configuration
 */
export const getTemplateConfig = () => config.templates;

/**
 * Get logging configuration
 */
export const getLoggingConfig = () => config.logging;

/**
 * Get security configuration
 */
export const getSecurityConfig = () => config.security;

/**
 * Get circuit breaker configuration
 */
export const getCircuitBreakerConfig = () => config.circuitBreaker;