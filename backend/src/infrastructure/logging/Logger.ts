// Structured logging (no external dependencies)
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private isProduction: boolean;

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;
    this.level = LOG_LEVELS[envLevel] >= 0 ? envLevel : 'info';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const entry: any = { timestamp, level, message };
    
    if (data) {
      if (this.isProduction) {
        entry.data = this.redactSensitiveFields(data);
      } else {
        entry.data = data;
      }
    }
    
    return this.isProduction ? JSON.stringify(entry) : this.prettyPrint(entry);
  }

  private redactSensitiveFields(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'jwt'];
    const redacted = { ...obj };
    
    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }
    
    return redacted;
  }

  private prettyPrint(entry: { level: string; [key: string]: any }): string {
    const colors: Record<string, string> = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    
    const reset = '\x1b[0m';
    const color = colors[entry.level] || reset;
    
    let output = `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${reset}`;
    
    if (entry.data) {
      output += `\n${JSON.stringify(entry.data, null, 2)}`;
    }
    
    return output;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, data));
    }
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, data));
    }
  }
}

export const logger = new Logger();

export default logger;