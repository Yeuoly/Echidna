import * as vscode from 'vscode'
import * as fs from 'fs'

import { EchidnaElement } from './container'
import { EchidnaDataProvider } from './container'
import { chat } from './chat'
import { summarizeRepository } from './summarize'

export function registerCommand(context: vscode.ExtensionContext, dataProvider: EchidnaDataProvider, workspace: string) {
    const dispose = vscode.commands.registerCommand('echidna.summary', async (item: EchidnaElement) => {
        if (!item.isUser) {
            vscode.window.showErrorMessage('Only users can be summarized currently.')
            return
        }

        const repoSummary = await summarizeRepository(workspace)
        console.log(repoSummary)
    })

    context.subscriptions.push(dispose)
}