import * as vscode from 'vscode'

import { EchidnaElement } from './container'
import { EchidnaDataProvider } from './container'
import { summarizeRepositoryUser, summarizeRepositoryUserCommit } from './summarize'
import { checkCommits, getDiff, gitUserCommits, todayUserCommits } from './helper'
import { withLoading } from './utils'
import { writeRepositoryUserCommits, writeRepositoryUserDailyReport } from './cache'
import { writeDailyReport } from './report'

export function registerCommand(context: vscode.ExtensionContext, dataProvider: EchidnaDataProvider, workspace: string) {
    const summaryDispose = vscode.commands.registerCommand('echidna.summary', async (item: EchidnaElement) => {
        if (!item.isUser) {
            vscode.window.showErrorMessage('Only users can be summarized currently.')
            return
        }

        // check commits
        const leaks = await checkCommits(dataProvider.workspace, item.user?.name || '')
        if (leaks.length !== 0) {
            const answer = await vscode.window.showQuickPick(['Yes', 'No'], {
                title: 'We found some commits which leak of enough information to summarize. Do you want to auto complete commits?',
                placeHolder: 'Yes',
            })
            if (answer === 'Yes') {
                let success = false
                await withLoading(async (feedback: (progress: number) => void) => {
                    const commits: { [commit: string]: string } = {}
                    try {
                        for (const hash of leaks) {
                            const diff = await getDiff(dataProvider.git, hash)
                            const message = await summarizeRepositoryUserCommit(hash, workspace, item.user?.name || '', diff, feedback)
                            commits[hash] = message
                        }
                    } catch (e) {
                        vscode.window.showErrorMessage(`Failed to summarize commits: ${e}`)
                        return
                    }
                    await writeRepositoryUserCommits(workspace, item.user?.name || '', commits)
                    success = true
                })

                if (!success) {
                    return
                }
            }
        }

        const commits = await gitUserCommits(dataProvider.workspace, item.user?.name || '')
        if (commits.length === 0) {
            vscode.window.showErrorMessage('User has no commits.')
            return
        }

        await withLoading(async (feedback: (progress: number) => void) => {
            await summarizeRepositoryUser(workspace, item.user?.name || '', commits, feedback)
            // open markdown
            const markdown = vscode.Uri.file(`${workspace}/.vscode/echidna.md`)
            await vscode.window.showTextDocument(markdown)
            // scroll to user
            const editor = vscode.window.activeTextEditor
            if (editor) {
                const idx = editor.document.getText().indexOf(`#### ${item.user?.name}`)
                if (idx >= 0) {
                    const line = editor.document.positionAt(idx || 0)
                    editor.revealRange(new vscode.Range(line, line), vscode.TextEditorRevealType.AtTop)
                }
            }
        })
    })

    context.subscriptions.push(summaryDispose)

    const reportDispose = vscode.commands.registerCommand('echidna.report', async (item: EchidnaElement) => {
        if (!item.isUser) {
            vscode.window.showErrorMessage('Only users can write report currently.')
            return
        }

        // check commits
        const answer = await vscode.window.showQuickPick(['DailyReport'], {
            title: 'Choose a report type',
            placeHolder: 'DailyReport',
        })
        if (answer === 'DailyReport') {
            let success = false
            withLoading(async (feedback: (progress: number) => void) => {
                const commits = await todayUserCommits(dataProvider.workspace, item.user?.name || '')
                const today = new Date()
                const timestamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
                try {
                    await writeDailyReport(dataProvider.git, dataProvider.workspace, item.user?.name || '', commits, feedback)
                } catch (e) {
                    vscode.window.showErrorMessage(`Failed to write daily report: ${e}`)
                    return
                }
                // open markdown
                const markdown = vscode.Uri.file(`${workspace}/.vscode/${item.user?.name}/dailyReport/${timestamp}.md`)
                await vscode.window.showTextDocument(markdown)
            })
            if (!success) {
                return
            }
        }
    })

    context.subscriptions.push(reportDispose)
}