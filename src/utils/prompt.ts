export async function prompt(vorpalInstance: any, message: string, defaultValue: string = '') {
  const res = await vorpalInstance.prompt({
    type: 'input',
    name: 'value',
    default: defaultValue,
    message
  });

  return res.value as string;
}
