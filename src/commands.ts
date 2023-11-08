import * as vscode from 'vscode'

import { EchidnaElement } from './container'
import { EchidnaDataProvider } from './container'
import { summarizeRepository, summarizeRepositoryUser } from './summarize'
import { gitUserCommits } from './helper'

export function registerCommand(context: vscode.ExtensionContext, dataProvider: EchidnaDataProvider, workspace: string) {
    const dispose = vscode.commands.registerCommand('echidna.summary', async (item: EchidnaElement) => {
        if (!item.isUser) {
            vscode.window.showErrorMessage('Only users can be summarized currently.')
            return
        }

        const commits = await gitUserCommits(item.user?.name || '')
        if (commits.length === 0) {
            vscode.window.showErrorMessage('User has no commits.')
            return
        }

        const repoSummary = await summarizeRepositoryUser(workspace, item.user?.name || '', commits)
        console.log(repoSummary)
    })

    context.subscriptions.push(dispose)
}