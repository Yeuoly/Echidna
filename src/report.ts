import { encodeChat } from "gpt-tokenizer"
import { getRepositorySummaryCache, getRepositoryUserDailyReport, getRepositoryUserSummary, writeRepositoryUserDailyReport } from "./cache"
import { GitLog, getDiff } from "./helper"
import { summarizeRepository } from "./summarize"
import { errorMessageEvent } from "./utils"
import { chat } from "./chat"
import { SimpleGit } from "simple-git"

let reportWriting = false
/**
 * writeReport writes a report for what you have done. such as "Daily Report"
 * @param git
 * @param repository 
 * @param user 
 * @param commits commits in time
 * @returns 
 */
export const writeDailyReport = (
    git: SimpleGit, repository: string, user: string, commits: GitLog[],
    feedback: (progress: number, message?: string) => void
) => new Promise<string>(async (resolve) => {
    if (reportWriting) {
        errorMessageEvent('Daily Report writing in progress. Please wait.')
        return
    }
    reportWriting = true

    // get today's timestamp: YYYY-MM-DD
    const today = new Date()
    const timestamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

    async function context() {
        // check cache
        const report = await getRepositoryUserDailyReport(repository, user, timestamp)
        if (report !== '') {
            resolve(report)
            return
        }

        const repositorySummary = await summarizeRepository(repository)

        let diff = ''
        // get diff
        feedback(0, 'Getting diff...')
        for (const commit of commits) {
            diff += await getDiff(git, commit.hash) + '\n'
        }

        const systemPrompt = `You're an experienced programmer. One day, due to fatigue, you forgot to add commit messages and only left behind the diff information for your changes.
Now, you need to analyze the diff information to summarize what was done in this particular commit. due to the diff information is too long, the diff you get may be incomplete.

You should only summarize the diff information and it should be detailed and concise so that your teammates can understand what you have done. It had better more than 100 words but less than 300 words.

Here is the summary of the repository:
${repositorySummary}`
        // split diff into multiple lines
        const lines = diff.split(/[\n\r]/g).map(l => l.trim()).filter(l => l.length > 0)

        feedback(0, 'Summarizing commits...')

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
        const systemPrompt2 = `As an experienced programmer, today you need to write my daily report. 
To ensure your supervisor understands what you accomplished, you will summarize the changes from git diff using straightforward and easily understandable language to describe today's commits.

You should write the report in Markdown format. It should be detailed and concise so that your supervisor can understand what you have done. It had better more than 300 words.

Today: ${timestamp}
Your name: ${user}

${repositorySummary}`

        const finalReport = await chat(systemPrompt2, summaries.join('\n\n'))

        // write cache
        await writeRepositoryUserDailyReport(repository, user, timestamp, finalReport)

        resolve(finalReport)
    }

    await context()
    reportWriting = false
})