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

export function italic(message: string): string {
  return chalk.italic(message)
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

export function tabulate(spaces: number = 0) {
  return spaces > 0 ? ' '.repeat(spaces) : ''
}

export function isEmpty(obj) {
  if (!obj) return true
  const keys = Object.keys(obj)
  if (!keys.length) {
    return true
  }
  return keys.every($ => obj[$] === undefined || obj[$] === [] || obj[$] === {} || obj[$] === '')
}

export function formatDictionary(
  obj: Object,
  options: { spacing: number; padding: number },
  level: number = 1,
  context?: 'array' | 'object'
): string {
  let buf = ''
  const keys = obj ? Object.keys(obj) : []

  keys.forEach((key, i) => {
    const item = obj[key]

    const separator = context === 'array' && i === 0 ? '' : tabulate(options.spacing * level + options.padding)

    if (Array.isArray(item)) {
      buf = buf.concat(separator, `${chalk.bold(key)}: `, formatList(item, options, level + 1, 'object'), '\n')
    } else if (typeof item === 'object') {
      const isHidden = isEmpty(item)
      const content = isHidden ? `: ${italic('No information available')}\n` : `:\n${formatDictionary(item, options, level + 1, 'object')}`
      buf = buf.concat(separator, `${chalk.bold(key)}`, content)
    } else if (item) {
      buf = buf.concat(separator, `${chalk.bold(key)}: `, JSON.stringify(item), '\n')
    }
  })

  return buf
}

export function formatList(
  list: Array<any>,
  options: { spacing: number; padding: number },
  level: number = 1,
  context?: 'array' | 'object'
): string {
  let buf = ''
  const separator = '\n' + tabulate(options.spacing * level + options.padding) + '- '
  if (list.length) {
    buf = list.reduce((buf, item, i) => {
      if (Array.isArray(item)) {
        return buf.concat(separator, formatList(list, options, level + 1, 'array'))
      } else if (typeof item === 'object') {
        return buf.concat(separator, formatDictionary(item, options, level + 1, 'array'))
      } else if (item) {
        return buf.concat(separator, JSON.stringify(item))
      }
    }, '')
  } else {
    buf = italic('No information available')
  }

  return buf
}
