import chalk from 'chalk'

import { isDebug } from './env'
import { isRecord } from '.'

export function debug(...messages: any[]): void {
  if (isDebug()) {
    console.log(...messages)
  }
}

export function error(message: string): string {
  return `${chalk.red('Error:')} ${message}`
}

export function warning(message: string): string {
  return `${chalk.yellow('Warning: ')}${message}`
}

export function tabulate(spaces: number = 0) {
  return spaces > 0 ? ' '.repeat(spaces) : ''
}

export function isEmpty(obj: Record<string, unknown>) {
  if (!obj) return true
  const keys = Object.keys(obj)
  if (!keys.length) {
    return true
  }
  return keys.every($ => obj[$] === undefined || obj[$] === [] || obj[$] === {} || obj[$] === '')
}

export function formatDictionary(
  obj: Record<string, unknown>,
  options: { spacing: number; padding: number },
  level: number = 1,
  context?: 'array' | 'object'
): string {
  let buf = ''
  const keys = obj ? Object.keys(obj) : []

  keys.forEach((key, i) => {
    const item = obj[key]

    const separator =
      context === 'array' && i === 0 ? '' : tabulate(options.spacing * level + options.padding)

    if (Array.isArray(item)) {
      buf = buf.concat(
        separator,
        `${chalk.bold(key)}: `,
        formatList(item, options, level + 1, 'object'),
        '\n'
      )
    } else if (isRecord(item)) {
      const isHidden = isEmpty(item)
      const content = isHidden
        ? `: ${chalk.italic('No information available')}\n`
        : `:\n${formatDictionary(item, options, level + 1, 'object')}`
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
      } else if (item !== undefined) {
        return buf.concat(separator, JSON.stringify(item))
      } else {
        return buf
      }
    }, '')
  } else {
    buf = chalk.italic('No information available')
  }

  return buf
}

export function formatOutdatedMessage(arg: {
  package: string
  installedVersion: string
  latestVersion: string
}): string {
  return [
    `A package is outdated:`,
    `  ${arg.package}:`,
    `    installed: ${arg.installedVersion}`,
    `    latest: ${arg.latestVersion}`,
    `    to upgrade to the latest version run the command:`,
    `      npm install ${arg.package}@latest`
  ].join('\n')
}
