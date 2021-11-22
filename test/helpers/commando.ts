import path from 'path'
import { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import spawn from 'cross-spawn'

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
  NO = 'no\n',
  DOWN = "\x1B\x5B\x42",
  UP = "\x1B\x5B\x41",
  ENTER = "\x0D",
  SPACE = "\x20",
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
  private orderedCommands: string[] = []

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

    this.proc.stdout.on('data', (data) => this.onData(data.toString()))
    this.proc.stderr.on('data', (data) => this.emit('err', data.toString()))
    this.proc.on('close', async () => {
      void Promise.all(this.promises)
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

  orderedWhen(
    pattern: string | RegExp,
    response: (msg: string) => any,
    options: IMatcherOptions = { matchMany: false }
  ) {
    this.orderedCommands.push(pattern.toString())
    this.when(pattern, response, options)
    return this
  }

  end() {
    this.proc.kill()
  }

  endWhen(
    pattern: string | RegExp,
    response?: (msg: string) => any,
    options: IMatcherOptions = { matchMany: false }
  ) {
    const cb = (msg) => {
      if (response) {
        const res = response(msg)
        if (
          'then' in response ||
          response.constructor.name === 'AsyncFunction'
        ) {
          this.promises.push(res)
        }
      }
      void Promise.all(this.promises).then(() => {
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

    if (this.orderedCommands.length) {
      const match = this.matchers.find(m => data.match(m.pattern))
      if (match) {
        const nextCommand = this.orderedCommands.shift()
        if (nextCommand !== match.pattern.toString()) {
          this.end()
        }
      }
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

      if (res && Array.isArray(res)) {
        res.forEach(r => this.proc.stdin.write(r))
      }

      if (!match.options.matchMany) {
        this.matchers.splice(i, 1)
      }
    })
  }
}

export default Commando

export function runCommand(dirPath: string, cmdName: string, args?: string) {
  const command = `node ${path.resolve('dist', 'index.js')} ${cmdName} ${args}`
  const cmd = new Commando(command, {
    silent: false,
    workingDir: dirPath,
    env: { NODE_ENV: 'development' }
  })

  cmd.when(/Send anonymous usage stats to Decentraland?/, () => Response.NO)

  return cmd
}

export function endCommand(cmd: Commando) {
  return new Promise((resolve) => {
    cmd.on('end', resolve)
  })
}