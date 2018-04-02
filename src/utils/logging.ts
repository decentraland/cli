import chalk from 'chalk'

export function notice(message: string): string {
  return chalk.blue(message)
}

export function error(message: string): string {
  return chalk.red(message)
}

export function success(message: string): string {
  return chalk.green(message)
}

export function exit(message: string, logger: any) {
  logger.log(error(message))
  process.exit(1)
}
