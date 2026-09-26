/**
 * Simple Logger Utility
 *
 * Provides structured logging for development and production.
 *
 * Every line goes through the central redaction pass
 * (`shared/observability/redact.ts`) and carries the request id of the request
 * it was written for, when there is one (`shared/observability/request-id.ts`).
 * Neither is the call site's job any more.
 *
 * `error` also reports to Sentry when it is on
 * (`shared/observability/logged-error-report.ts`); pass `{ report: false }`
 * only for a line a stranger can produce at will, or one the caller reports
 * itself.
 */

import { reportLoggedError } from '@/shared/observability/logged-error-report'
import { redact } from '@/shared/observability/redact'
import { currentRequestId } from '@/shared/observability/request-id'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogData {
  message: string
  level: LogLevel
  timestamp: string
  [key: string]: unknown
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatLog(level: LogLevel, message: string, data?: Record<string, unknown>): LogData {
    const requestId = currentRequestId()

    return {
      level,
      message: redact(message),
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
      ...(data ? redact(data) : {}),
    }
  }

  private output(logData: LogData) {
    if (this.isDevelopment) {
      // Pretty print for development
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
      }[logData.level]

      console.log(`${emoji} [${logData.level.toUpperCase()}] ${logData.message}`)
      if (Object.keys(logData).length > 3) {
        const extraData = Object.fromEntries(
          Object.entries(logData).filter(([key]) => !['level', 'message', 'timestamp'].includes(key))
        )
        console.log('  ', extraData)
      }
    } else {
      // JSON for production (easier for log aggregators)
      console.log(JSON.stringify(logData))
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.output(this.formatLog('info', message, data))
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.output(this.formatLog('warn', message, data))
  }

  error(message: string, data?: Record<string, unknown>, options?: { report?: boolean }) {
    const line = this.formatLog('error', message, data)
    this.output(line)
    if (options?.report !== false) {
      reportLoggedError(message, data, line.requestId as string | undefined)
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (this.isDevelopment) {
      this.output(this.formatLog('debug', message, data))
    }
  }

  // HTTP request logging
  request(method: string, path: string, statusCode: number, duration: number, userId?: string) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

    this.output(
      this.formatLog(level, `${method} ${path} ${statusCode}`, {
        method,
        path,
        statusCode,
        duration: `${duration}ms`,
        userId,
      })
    )
  }
}

export const logger = new Logger()
