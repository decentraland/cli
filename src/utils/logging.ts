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

export function warn(message: string) {
  const instance = ora(message).warn()
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
  if (isDev) logger.log(error(err.stack))
  process.exit(1)
}

export function tabulate(spaces: number = 0) {
  return spaces > 0 ? ' '.repeat(spaces) : ''
}

export function isEmpty(obj) {
  const keys = Object.keys(obj)
  if (!keys.length) {
    return true
  }
  return keys.every($ => !obj[$])
}

export function formatDictionary(obj: Object, spaceCount: number = 0, hideEmpty: boolean = false): string {
  let buf = '\n'
  const keys = Object.keys(obj)
  const spaces = tabulate(spaceCount)

  if (!keys.length) {
    if (hideEmpty) return '\n'
    return ' {}\n'
  }

  keys.forEach((key, i) => {
    const item = obj[key]
    if (Array.isArray(item)) {
      buf = buf.concat(spaces, `${chalk.bold(key)}: `, formatList(item, spaceCount), '\n')
    } else if (typeof item === 'object') {
      const empty = isEmpty(item)
      buf = buf.concat(spaces, `${chalk.bold(key)}`, empty && hideEmpty ? '' : ':', formatDictionary(item, spaceCount + 2))
    } else if (item) {
      buf = buf.concat(spaces, `${chalk.bold(key)}: `, JSON.stringify(item), '\n')
    }
  })

  return buf
}

export function formatList(list: Array<any>, spaceCount: number): string {
  const spaces = tabulate(spaceCount)
  if (list.length) {
    return list.reduce((buf, item, i) => {
      if (Array.isArray(item)) {
        return buf + `\n${spaces}- ${formatList(item, spaceCount)}`
      } else if (typeof item === 'object') {
        return buf + formatDictionary(item, spaceCount, false)
      } else if (item) {
        return buf + `\n${spaces}- ${JSON.stringify(item)}`
      }
    }, '')
  } else {
    return '[]'
  }
}
