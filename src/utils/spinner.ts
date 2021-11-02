import ora from 'ora'

let spinner: ora.Ora | null = null

export function create(message: string) {
  if (!process.stdout.isTTY && process.env.DEBUG) {
    return console.log(message)
  }

  if (spinner) {
    spinner.succeed()
  }

  spinner = ora(message).start()
}

export function fail(message?: string) {
  if (!process.stdout.isTTY && process.env.DEBUG && message) {
    return console.log(message)
  }

  if (spinner) {
    spinner.fail(message)
  }
}

export function warn(message?: string) {
  if (!process.stdout.isTTY && process.env.DEBUG && message) {
    return console.log(message)
  }

  if (spinner) {
    spinner.warn(message)
    spinner = null
  }
}

export function info(message?: string) {
  if (!process.stdout.isTTY && process.env.DEBUG && message) {
    return console.log(message)
  }

  if (spinner) {
    spinner.info(message)
    spinner = null
  }
}

export function succeed(message?: string) {
  if (!process.stdout.isTTY && process.env.DEBUG && message) {
    return console.log(message)
  }

  if (spinner) {
    spinner.succeed(message)
    spinner = null
  }
}
