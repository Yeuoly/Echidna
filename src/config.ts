import * as vscode from 'vscode'

export const configGetOpenAIUrl = () => vscode.workspace.getConfiguration('echidna').get('OpenAIUrl') as string
export const configGetOpenAIKey = () => vscode.workspace.getConfiguration('echidna').get('OpenAIKey') as string
export const configGetOpenAIDefaultModel = () => vscode.workspace.getConfiguration('echidna').get('OpenAIDefaultModel') as string
export const configGetOpenAIDefaultTemperature = () => vscode.workspace.getConfiguration('echidna').get('OpenAIDefaultTemperature') as number