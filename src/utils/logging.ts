import chalk from 'chalk'
import { isDev } from './env'
import ora = require('ora')

export function error(message: string): string {
  return chalk.red(message)
}

export function comment(message: string): string {
  return chalk.grey(message)
}

export function notice(message: string): string {
  return chalk.blue(message)
}

export function highlight(message: string): string {
  return chalk.yellow(message)
}

export function positive(message: string): string {
  return chalk.green(message)
}

export function info(message: string) {
  return ora(message).info()
}

export function success(message: string) {
  return ora(message).succeed()
}

export function warn(message: string) {
  return ora(message).warn()
}

export function loading(message: string) {
  const spinner = ora(message).start()
  if (!spinner['isSpinning']) {
    // fallback to show message even when Ora is not supported
    console['log'](message)
  }
  return spinner
}

export function exit(err: Error, logger: any) {
  logger.log(error('\n' + err.message))
  if (isDev) logger.log(error(err.stack))
  process.exit(1)
}
