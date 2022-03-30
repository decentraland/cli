import chalk from 'chalk'

export const help = () => `
${chalk.bold(
  'dcl export'
)} was deprecated in 3.10.0 version of the Decentraland CLI.
`
export async function main(): Promise<number> {
  const link = 'https://docs.decentraland.org/development-guide/deploy-to-now/'
  console.warn(
    `\`dcl export\` is not being supported in this CLI version. Please visit ${link} to more information`
  )
  return 1
}
