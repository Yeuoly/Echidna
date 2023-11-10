import {
    encodeChat,
} from 'gpt-tokenizer'
import { ChatMessage } from 'gpt-tokenizer/esm/GptEncoding'
import { chat } from './chat'
import {
    getRepositorySummaryCache, writeRepositorySummaryCache,
    writeRepositoryUserSummary, getRepositoryUserSummary, writeRepositoryUserCommits
} from './cache'
import { errorMessageEvent, findLanguage, getReadme, withLoading } from './utils'
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
    const cache = await getRepositorySummaryCache(repository)
    if (cache && cache.length > 0) {
        resolve(cache)
        return
    }
    // try to find readme
    const readme = await getReadme(repository)
    const languages = await findLanguage(repository)
    let summary = ''

    if (readme.length > 10000) {
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
        if (chatWithinTokenLimit.length > 16000) {
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
                if (chatWithinTokenLimit.length > 16000) {
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

let summarizing = false
/**
 * summarizeRepositoryUser summarizes a user's contributions to a repository.
 * @param repository 
 * @param user 
 * @returns 
 */
export const summarizeRepositoryUser = (
    repository: string, user: string, commits: GitLog[],
    feedback: (progress: number, message?: string) => void
) => new Promise<string>(async (resolve) => {
    if (summarizing) {
        errorMessageEvent('Summarizing in progress. Please wait.')
        return
    }
    summarizing = true

    async function context() {
        // check cache
        const cache = await getRepositoryUserSummary(repository, user)
        if (cache && cache.length > 0) {
            resolve(cache)
            return
        }

        feedback(0, 'Summarizing repository...')
        const repositorySummary = await summarizeRepository(repository)
        feedback(0, 'Summarizing commits...')
        const systemPrompt = `You are an experienced software architect tasked with summarizing and evaluating the contributions of an individual within a Git repository.
Your summary should include his primary areas of focus, the extent of his contributions to this repository.
    
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
            if (chatWithinTokenLimit.length > 16000) {
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
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i]
            summaries.push(await summarizeCommit(message))
            feedback((i + 1) * 100 / messages.length, `Summarizing commits... (${i + 1}/${messages.length})`)
        }
        // summarize summary
        const systemPrompt2 = `You are an experienced software architect tasked with summarizing and evaluating the contributions of an individual within a Git repository.
Your summary should his their primary areas of focus, the extent of his contributions to this repository.
    
You will be given a summary of the repository and a list of partial summaries of the commits by the user. do not describe the commits, but summarize them.
What's more, the summary should be useful for the third party to understand the user's contributions to the repository.
    
Here is the summary of the repository:
${repositorySummary}
    `

        const summarizeSummary = (summary: string) => new Promise<string>(async resolve => {
            resolve(await chat(systemPrompt2, summary))
        })

        let partialSummaryCount = 0

        const summarizePartialSummary = (summaries: string[]) => new Promise<string[]>(async resolve => {
            // cause we are using gpt-3.5-turbo, we can only summarize 16K tokens at a time, but we choose 16000 to be safe
            // we should recursively summarize until we reach the limit
            feedback(0, `Summarizing partial summaries... (${partialSummaryCount})`)
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
                if (chatWithinTokenLimit.length > 16000) {
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
        feedback(1, 'Summarizing final summary...')
        // write cache
        await writeRepositoryUserSummary(repository, user, finalSummary[0])
        resolve(finalSummary[0])
    }

    try {
        await context()
    } finally {
        summarizing = false
    }
})

export const summarizeRepositoryUserCommit = (
    hash: string, repository: string, user: string, diff: string,
    feedback: (progress: number, message?: string) => void
) => new Promise<string>(async (resolve) => {
    async function context() {
        feedback(0, 'Summarizing repository...')
        const repositorySummary = await summarizeRepository(repository)

        feedback(0, `Summarizing commit(${hash.slice(0, 8)})...`)
        const systemPrompt = `You're an experienced programmer. One day, due to fatigue, you forgot to add commit messages and only left behind the diff information for your changes.
Now, you need to analyze the diff information to summarize what was done in this particular commit. due to the diff information is too long, the diff you get may be incomplete.

You should only summarize the diff information and it should be short and concise. so that it can be used as a commit message.

Here is the summary of the repository:
${repositorySummary}
`

        // split diff into multiple lines
        const lines = diff.split(/[\n\r]/g).map(l => l.trim()).filter(l => l.length > 0)

        const summarizeCommit = (commit: string) => new Promise<string>(async resolve => {
            const summary = await chat(systemPrompt, commit)
            resolve(summary)
        })

        // merge lines to messages, each message should be less than 16000
        const messages: string[] = []
        for (let i = 0; i < lines.length; i++) {
            if (messages.length == 0) {
                messages.push(lines[i])
                continue
            }
            // check if last message can be merged
            const message = messages[messages.length - 1]
            const chatWithinTokenLimit = encodeChat([{
                role: 'system',
                content: systemPrompt
            }, {
                role: 'user',
                content: message + '\n' + lines[i]
            }], 'gpt-3.5-turbo')

            if (chatWithinTokenLimit.length > 16000) {
                messages.push(lines[i])
            } else {
                messages[messages.length - 1] = message + '\n' + lines[i]
            }
        }

        // summarize each message
        const summaries = []
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i]
            summaries.push(await summarizeCommit(message))
            feedback((i + 1) * 100 / messages.length, `Summarizing commits... (${i + 1}/${messages.length})`)
        }

        // summarize summary
        const systemPrompt2 = `You're an experienced programmer. One day, due to fatigue, you forgot to add commit messages and only left behind the diff information for your changes.
Now, you have already got multiple summaries of the diff information. you need to summarize them into a final commit message.
You should only summarize the diff information and it should be short and concise. so that it can be used as a commit message. It had better less than 20 words.

Here is the summary of the repository:
${repositorySummary}
`

        let finalSummary = ''
        if (summaries.length == 1) {
            finalSummary = summaries[0]
        } else {
            feedback(1, 'Summarizing final summary...')

            const summarizeSummary = (summary: string) => new Promise<string>(async resolve => {
                resolve(await chat(systemPrompt2, summary))
            })

            finalSummary = await summarizeSummary(summaries.join('\n'))
        }

        resolve(finalSummary)
    }

    try {
        await context()
    } catch (e) {
        throw e
    } finally {
        summarizing = false
    }
})