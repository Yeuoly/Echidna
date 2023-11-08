import { readFile, readdir, existsSync, lstat, writeFile } from 'fs'
import { join } from 'path'
import {
    encodeChat,
} from 'gpt-tokenizer'
import { ChatMessage } from 'gpt-tokenizer/esm/GptEncoding'
import { chat } from './chat'
import { 
    getRepositorySummaryCache, writeRepositorySummaryCache,
    writeRepositoryUserSummary, getRepositoryUserSummary
} from './cache'
import { findLanguage } from './utils'
import { GitLog } from './helper'

/**
 * summarizeRepository summarizes a git repository.
 * it will try to find all useful information about the repository and summarize it.
 * 
 * One repo can be considered consisting of:
 * - Languages
 * - Purpose
 * - File architecture
 * @param repository path to the repository
 * @returns a summary text of the repository
 */
export const summarizeRepository = (
    repository: string
) => new Promise<string>(async (resolve) => {
    // check cache
    const cache = await getRepositorySummaryCache(repository)
    if (cache && cache.length > 0) {
        resolve(cache)
        return
    }
    // try to find readme
    const readme = await new Promise<string>(resolve => {
        readdir(repository, (err, files) => {
            if (err) {
                resolve('')
                return
            }
            for (const file of files) {
                if (file.toLowerCase().startsWith('readme') && file.endsWith('.md')) {
                    readFile(`${repository}/${file}`, (err, data) => {
                        if (err) {
                            resolve('')
                            return
                        }
                        resolve(data.toString())
                    })
                    return
                }
            }
            resolve('')
        })
    })

    const languages = await findLanguage(repository)

    let summary = ''

    if (readme.length > 3000) {
        // try to find major language
        const systemPrompt = `You are a seasoned software architect tasked with reviewing a Git repository's README file and summarizing it into a short but reasonable README.
The text should include what problem this repository addresses, its intended use, and the primary technologies it leverages.`
        const messages = [{
            role: 'system',
            content: systemPrompt
        }, {
            role: 'user',
            content: readme
        }] as ChatMessage[]

        const chatWithinTokenLimit = encodeChat(messages, 'gpt-3.5-turbo')
        if (chatWithinTokenLimit.length > 3000) {
            // split messages into multiple parts
            const paragraphs = readme.split('\n\n').filter(p => p.length > 0)
            const messages = []
            // try merge paragraphs, if not possible, split into multiple messages
            let index = 0
            for (let i = 1; i <= paragraphs.length; i++) {
                const paragraph = paragraphs.slice(index, i).join('\n')
                const chatWithinTokenLimit = encodeChat([{
                    role: 'system',
                    content: systemPrompt
                }, {
                    role: 'user',
                    content: paragraph
                }], 'gpt-3.5-turbo')
                if (chatWithinTokenLimit.length > 3000) {
                    messages.push(paragraphs.slice(index, i - 1).join('\n'))
                    index = i - 1
                }
            }
            // merge last
            messages.push(paragraphs.slice(index).join('\n'))

            // summarize each paragraph
            const summarizeReadme = (paragraph: string) => new Promise<string>(async resolve => {
                const summary = await chat(systemPrompt, paragraph)
                resolve(summary)
            })

            const summaries = []
            for (const message of messages) {
                summaries.push(await summarizeReadme(message))
            }
            // summarize summary
            const summarizeSummary = (summary: string) => new Promise<string>(async resolve => {
                resolve(await chat(systemPrompt, summary))
            })
            summary = await summarizeSummary(summaries.join('\n'))
        } else {
            const summarizeReadme = (paragraph: string) => new Promise<string>(resolve => {
                chat(systemPrompt, paragraph).then(summary => {
                    resolve(summary)
                })
            })
            summary = await summarizeReadme(readme)
        }
    } else {
        summary = readme
    }
    
    const finalSummary = `The repository is named ${repository.split('/').pop()}.
Top languages: ${languages.join(', ')}.
${summary}
    `

    // write cache
    await writeRepositorySummaryCache(repository, finalSummary)
    resolve(finalSummary)
})

/**
 * summarizeRepositoryUser summarizes a user's contributions to a repository.
 * @param repository 
 * @param user 
 * @returns 
 */
export const summarizeRepositoryUser = (repository: string, user: string, commits: GitLog[]) => new Promise<string>(async (resolve) => {
    // check cache
    const cache = await getRepositoryUserSummary(repository, user)
    if (cache && cache.length > 0) {
        resolve(cache)
        return
    }

    const repositorySummary = await summarizeRepository(repository)
    const systemPrompt = `You are an experienced software architect tasked with summarizing and evaluating the contributions of an individual within a Git repository.
Your summary should include their primary areas of focus, the extent of their contributions to this repository, and the potential impact on their career progression.
This is a crucial assessment.

You will be given a summary of the repository and a list of commits by the user. do not describe the commits, but summarize them.
What's more, the summary should be useful for the third party to understand the user's contributions to the repository.

Here is the summary of the repository:
${repositorySummary}
    `
    // merge commits to messages
    const messages: string[] = []
    let index = 0
    for (let i = 1; i <= commits.length; i++) {
        const commit = commits.slice(index, i).map(c => `${c.date} - ${c.message}`).join('\n')
        const chatWithinTokenLimit = encodeChat([{
            role: 'system',
            content: systemPrompt
        }, {
            role: 'user',
            content: commit
        }], 'gpt-3.5-turbo')
        if (chatWithinTokenLimit.length > 3000) {
            messages.push(commits.slice(index, i - 1).map(c => `${c.date} - ${c.message}`).join('\n'))
            index = i - 1
        }
    }

    // merge last
    if (index < commits.length) {
        messages.push(commits.slice(index).map(c => `${c.date} - ${c.message}`).join('\n'))
    }

    // summarize each commit
    const summarizeCommit = (commit: string) => new Promise<string>(async resolve => {
        const summary = await chat(systemPrompt, commit)
        resolve(summary)
    })

    const summaries = []
    for (const message of messages) {
        summaries.push(await summarizeCommit(message))
    }
    // summarize summary
    const systemPrompt2 = `You are an experienced software architect tasked with summarizing and evaluating the contributions of an individual within a Git repository.
Your summary should include their primary areas of focus, the extent of their contributions to this repository, and the potential impact on his career progression.
This is a crucial assessment.

You will be given a summary of the repository and a list of partial summaries of the commits by the user. do not describe the commits, but summarize them.
What's more, the summary should be useful for the third party to understand the user's contributions to the repository.

Here is the summary of the repository:
${repositorySummary}
`

    const summarizeSummary = (summary: string) => new Promise<string>(async resolve => {
        resolve(await chat(systemPrompt2, summary))
    })

    const summarizePartialSummary = (summaries: string[]) => new Promise<string[]>(async resolve => {
        // cause we are using gpt-3.5-turbo, we can only summarize 4097 tokens at a time, but we choose 3000 to be safe
        // we should recursively summarize until we reach the limit
        const messages: string[] = []
        let index = 0
        for (let i = 1; i <= summaries.length; i++) {
            const commit = summaries.slice(index, i).join('\n')
            const chatWithinTokenLimit = encodeChat([{
                role: 'system',
                content: systemPrompt2
            }, {
                role: 'user',
                content: commit
            }], 'gpt-3.5-turbo')
            if (chatWithinTokenLimit.length > 3000) {
                messages.push(summaries.slice(index, i - 1).join('\n'))
                index = i - 1
            }
        }
        // merge last
        if (index < summaries.length) {
            messages.push(summaries.slice(index).join('\n'))
        }

        // summarize each summary
        const newSummaries = []
        for (const message of messages) {
            newSummaries.push(await summarizeSummary(message))
        }

        // check if we need to summarize again
        if (newSummaries.length > 1) {
            resolve(await summarizePartialSummary(newSummaries))
        } else {
            resolve(newSummaries)
        }
    })

    const finalSummary = await summarizePartialSummary(summaries)
    // write cache
    await writeRepositoryUserSummary(repository, user, finalSummary[0])
    resolve(finalSummary[0])
})