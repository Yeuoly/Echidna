import { readFile, readdir, existsSync, lstat, writeFile, mkdir, mkdirSync } from 'fs'
import { join } from 'path'
import { gitUser } from './helper'

/**
 * Created by: Github Copilot
 */

// create .vscode
const createVscode = (repository: string) => new Promise<void>(resolve => {
    mkdir(join(repository, '.vscode'), () => {
        resolve()
    })
})

export const writeMarkdown = (repository: string) => new Promise<void>(async resolve => {
    // get json
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, async (err, data) => {
            if (err) {
                resolve()
                return
            }
            const json = JSON.parse(data.toString())
            // write markdown
            let markdown = ''
            markdown += `## ${repository}\n\n`
            markdown += `### Summary\n\n`
            markdown += `${json.summary}\n\n`
            markdown += `### User Summary\n\n`
            for (const user in json.userSummary) {
                markdown += `#### ${user}\n\n`
                markdown += '| Commits | Additions | Deletions |\n'
                markdown += '| ------- | --------- | --------- |\n'
                const gitUserInfo = await gitUser(user)
                if (gitUserInfo) {
                    markdown += `| ${gitUserInfo.commits} | ${gitUserInfo.additions} | ${gitUserInfo.deletions} |\n\n`
                } else {
                    markdown += `| 0 | 0 | 0 |\n\n`
                }
                markdown += `${json.userSummary[user]}\n\n`
            }

            writeFile(join(repository, '.vscode/echidna.md'), markdown, () => {
                resolve()
            })
        })
    } else {
        resolve()
    }
})

export const getRepositorySummaryCache = (repository: string) => new Promise<string>(async resolve => {
    await createVscode(repository)
    // read .vscode/echidna.json
    // if exists, return the summary
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, (err, data) => {
            if (err) {
                resolve('')
                return
            }
            resolve(JSON.parse(data.toString()).summary)
        })
    } else {
        resolve('')
    }
})

export const writeRepositorySummaryCache = (repository: string, summary: string) => new Promise<void>(async resolve => {
    await createVscode(repository)
    // write .vscode/echidna.json
    // if exists, return the summary
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, (err, data) => {
            if (err) {
                writeFile(echidnaJson, JSON.stringify({
                    summary
                }), () => {
                    resolve()
                    writeMarkdown(repository)
                })
            } else {
                const json = JSON.parse(data.toString())
                json.summary = summary
                writeFile(echidnaJson, JSON.stringify(json), () => {
                    resolve()
                    writeMarkdown(repository)
                })
            }
        })
    } else {
        writeFile(echidnaJson, JSON.stringify({
            summary
        }), () => {
            resolve()
            writeMarkdown(repository)
        })
    }

})

export const writeRepositoryUserSummary = (repository: string, user: string, summary: string) => new Promise<void>(async resolve => {
    await createVscode(repository)
    // write .vscode/echidna.json
    // if exists, return the summary
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, (err, data) => {
            if (err) {
                writeFile(echidnaJson, JSON.stringify({
                    userSummary: {
                        [user]: summary
                    }
                }), () => {
                    resolve()
                    writeMarkdown(repository)
                })
            } else {
                const json = JSON.parse(data.toString())
                if (json.userSummary === undefined) {
                    json.userSummary = {}
                }
                json.userSummary[user] = summary
                writeFile(echidnaJson, JSON.stringify(json), () => {
                    resolve()
                    writeMarkdown(repository)
                })
            }
        })
    } else {
        writeFile(echidnaJson, JSON.stringify({
            userSummary: {
                [user]: summary
            }
        }), () => {
            resolve()
            writeMarkdown(repository)
        })
    }
})

export const getRepositoryUserSummary = (repository: string, user: string) => new Promise<string>(async resolve => {
    await createVscode(repository)
    // read .vscode/echidna.json
    // if exists, return the summary
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, (err, data) => {
            if (err) {
                resolve('')
                return
            }
            const json = JSON.parse(data.toString())
            if (json.userSummary === undefined) {
                resolve('')
                return
            }
            resolve(json.userSummary[user] || '')
        })
    } else {
        resolve('')
    }
})

export const getRepositoryUserCommits = (repository: string, user: string) => new Promise<{
    [commit: string]: string
}>(async resolve => {
    await createVscode(repository)
    // read .vscode/echidna.json
    // if exists, return the summary
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, (err, data) => {
            if (err) {
                resolve({})
                return
            }
            const json = JSON.parse(data.toString())
            if (json.userCommits === undefined) {
                resolve({})
                return
            }
            resolve(json.userCommits[user] || {})
        })
    } else {
        resolve({})
    }
})

export const writeRepositoryUserCommits = (repository: string, user: string, commits: {
    [commit: string]: string
}) => new Promise<void>(async resolve => {
    await createVscode(repository)
    // write .vscode/echidna.json
    // if exists, return the summary
    const echidnaJson = join(repository, '.vscode/echidna.json')
    if (existsSync(echidnaJson)) {
        readFile(echidnaJson, (err, data) => {
            if (err) {
                writeFile(echidnaJson, JSON.stringify({
                    userCommits: {
                        [user]: commits
                    }
                }), () => {
                    resolve()
                })
            } else {
                const json = JSON.parse(data.toString())
                if (json.userCommits === undefined) {
                    json.userCommits = {}
                }
                json.userCommits[user] = commits
                writeFile(echidnaJson, JSON.stringify(json), () => {
                    resolve()
                })
            }
        })
    } else {
        writeFile(echidnaJson, JSON.stringify({
            userCommits: {
                [user]: commits
            }
        }), () => {
            resolve()
        })
    }
})

export const writeRepositoryUserDailyReport = (repository: string, user: string, timestamp: string, report: string) => new Promise<void>(async resolve => {
    await createVscode(repository)
    // write .vscode/user/dailyReport/timestamp.md
    // create dirs
    const userDir = join(repository, `.vscode/${user}`)
    if (!existsSync(userDir)) {
        mkdirSync(userDir)
    }
    const dailyReportDir = join(repository, `.vscode/${user}/dailyReport`)
    if (!existsSync(dailyReportDir)) {
        mkdirSync(dailyReportDir)
    }

    const dailyReportFile = join(repository, `.vscode/${user}/dailyReport/${timestamp}.md`)
    writeFile(dailyReportFile, report, () => {
        resolve()
    })
})

export const getRepositoryUserDailyReport = (repository: string, user: string, timestamp: string) => new Promise<string>(async resolve => {
    await createVscode(repository)
    // read .vscode/user/dailyReport/timestamp.md
    const dailyReportFile = join(repository, `.vscode/${user}/dailyReport/${timestamp}.md`)
    if (existsSync(dailyReportFile)) {
        readFile(dailyReportFile, (err, data) => {
            if (err) {
                resolve('')
                return
            }
            resolve(data.toString())
        })
    } else {
        resolve('')
    }
})