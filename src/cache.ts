import { readFile, readdir, existsSync, lstat, writeFile, mkdir } from 'fs'
import { join } from 'path'
import { gitUser } from './helper'

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