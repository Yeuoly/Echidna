import * as vscode from 'vscode'

const config = vscode.workspace.getConfiguration('echidna')

export const configGetOpenAIUrl = () => config.get('OpenAIUrl') as string
export const configGetOpenAIKey = () => config.get('OpenAIKey') as string
export const configGetOpenAIDefaultModel = () => config.get('OpenAIDefaultModel') as string
export const configGetOpenAIDefaultTemperature = () => config.get('OpenAIDefaultTemperature') as number