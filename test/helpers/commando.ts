import * as path from 'path'
import { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import spawn = require('cross-spawn')

export interface IOptions {
  silent: boolean
  cmdPath?: string
  workingDir?: string
  env?: { [key: string]: string }
}

export interface IMatcherOptions {
  matchMany: boolean
}

export enum Response {
  YES = 'Yes\n',
  NO = 'no\n'
}

class Commando extends EventEmitter {
  private proc: ChildProcess
  private matchers: {
    pattern: RegExp
    response: (mag: string) => any
    options: IMatcherOptions
  }[] = []
  private promises: Promise<any>[] = []
  private onDataFn: (string) => void

  constructor(
    command: string,
    opts: IOptions = { silent: false, env: {} },
    onDataFn?: (string) => void
  ) {
    super()
    this.onDataFn = onDataFn
    const parts = command.split(' ')
    const cmd = opts.cmdPath ? path.resolve(opts.cmdPath, parts[0]) : parts[0]

    this.proc = spawn(cmd, parts.slice(1), {
      env: { ...process.env, ...opts.env },
      cwd: opts.workingDir
    })

    if (!opts.silent) {
      this.proc.stdout.pipe(process.stdout)
    }

    this.proc.stdout.on('data', data => this.onData(data.toString()))
    this.proc.stderr.on('data', data => this.emit('err', data.toString()))
    this.proc.on('close', async () => {
      await Promise.all(this.promises)
      this.emit('end')
    })
  }

  when(
    pattern: string | RegExp,
    response: (msg: string) => any,
    options: IMatcherOptions = { matchMany: false }
  ) {
    this.matchers.push({ pattern: new RegExp(pattern), response, options })
    return this
  }

  endWhen(
    pattern: string | RegExp,
    response?: (msg: string) => any,
    options: IMatcherOptions = { matchMany: false }
  ) {
    const cb = msg => {
      if (response) {
        const res = response(msg)
        if ('then' in response || response.constructor.name === 'AsyncFunction') {
          this.promises.push(res)
        }
      }
      Promise.all(this.promises).then(() => {
        this.proc.kill()
      })
    }
    this.matchers.push({ pattern: new RegExp(pattern), response: cb, options })
    return this
  }

  private onData(data: string) {
    if (this.onDataFn) {
      this.onDataFn(data)
    }

    this.matchers.forEach((match, i) => {
      if (!data.match(match.pattern)) {
        return
      }

      const res = match.response(data)

      if ('then' in match.response) {
        this.promises.push(res)
        return
      }

      if (res && typeof res === 'string') {
        this.proc.stdin.write(res)
      }

      if (!match.options.matchMany) {
        this.matchers.splice(i, 1)
      }
    })
  }
}

export default Commando
