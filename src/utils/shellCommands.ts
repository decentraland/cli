import { spawn } from 'child_process'

enum FileDescriptorStandardOption {
  SILENT = 1,
  PIPE = 2,
  ONLY_IF_THROW = 3
}

export function runCommand({
  workingDir,
  command,
  args,
  fdStandards
}: {
  workingDir: string
  command: string
  args: string[]
  fdStandards?: FileDescriptorStandardOption
}): Promise<void> {
  const standardOption = fdStandards || FileDescriptorStandardOption.SILENT
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      cwd: workingDir,
      env: { ...process.env, NODE_ENV: '' }
    })

    let stdOut = ''
    let stdErr = ''

    if (standardOption === FileDescriptorStandardOption.PIPE) {
      child.stdout.pipe(process.stdout)
      child.stderr.pipe(process.stderr)
    } else if (standardOption === FileDescriptorStandardOption.ONLY_IF_THROW) {
      child.stdout.on('data', (data) => {
        stdOut += data.toString()
      })

      child.stderr.on('data', (data) => {
        stdErr += data.toString()
      })
    }

    child.on('close', (code) => {
      const errorMessage = `Command '${command}' with args '${args.join(
        ' '
      )}' exited with code ${code}. \n
          > Working directory: ${workingDir} `

      if (code !== 0) {
        if (standardOption === FileDescriptorStandardOption.ONLY_IF_THROW) {
          reject(
            new Error(`${errorMessage} \n
            > Standard output: \n ${stdOut} \n
            > Error output: \n ${stdErr} \n`)
          )
        } else {
          reject(new Error(errorMessage))
        }
      }
      resolve()
    })
  })
}

export function downloadRepo(
  workingDir: string,
  url: string,
  destinationPath: string
): Promise<void> {
  return runCommand({
    workingDir,
    command: 'git',
    args: ['clone', '--depth', '1', url, destinationPath],
    fdStandards: FileDescriptorStandardOption.ONLY_IF_THROW
  })
}
