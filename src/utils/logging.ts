import chalk from 'chalk'
import ora = require('ora')

export function error(message: string): string {
  return chalk.red(message)
}

export function comment(message: string): string {
  return chalk.grey(message)
}

export function warning(message: string): string {
  return chalk.yellow(message)
}

export function bold(message: string): string {
  return chalk.bold(message)
}

export function positive(message: string): string {
  return chalk.green(message)
}

export function info(message: string) {
  const instance = ora(message).info()
  if (!instance['enabled']) {
    // fallback to show message even when Ora is not supported
    console['log'](message)
  }
}

export function success(message: string) {
  const instance = ora(message).succeed()
  if (!instance['enabled']) {
    // fallback to show message even when Ora is not supported
    console['log'](message)
  }
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
  logger.log(error('\n' + err.message + '\n'))
  if (process.env.DEBUG) logger.log(error(err.stack))
  process.exit(1)
}
