import inquirer = require('inquirer');

export async function prompt(message: string, defaultValue: string = '') {
  const res = await inquirer.prompt({
    type: 'input',
    name: 'value',
    default: defaultValue,
    message
  });

  return res.value as string;
}
