import { readFile, readdir, existsSync, lstat } from 'fs'
import { join } from 'path'
import {
    encodeChat,
    isWithinTokenLimit,
} from 'gpt-tokenizer'
import { ChatMessage } from 'gpt-tokenizer/esm/GptEncoding'
import { chat } from './chat'

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

            const summaries = await Promise.all(messages.map(summarizeReadme))
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

    resolve(finalSummary)
})

const findLanguage = (repository: string) => new Promise<string[]>(resolve => {
    const languages = []
    // find top 3 languages
    let phps = 0
    let pys = 0
    let javas = 0
    let cpps = 0
    let jss = 0
    let gos = 0
    let rusts = 0
    let rubys = 0
    let csharps = 0
    let swifts = 0
    let cs = 0
    let shells = 0
    let htmls = 0
    let mds = 0

    const files: string[] = []
    const walk = (dir: string) => {
        readdir(dir, (err, files) => {
            if (err) {
                return
            }
            for (const file of files) {
                lstat(join(dir, file), (err, stat) => {
                    if (err) {
                        return
                    }
                    if (stat.isDirectory()) {
                        walk(join(dir, file))
                    } else {
                        files.push(join(dir, file))
                    }
                })
            }
        })
    }
    walk(repository)

    // check if Python, based on requirements.txt, setup.py, etc.
    const python = function(){
        if (existsSync(join(repository, 'requirements.txt'))) {
            return true
        }
        if (existsSync(join(repository, 'setup.py'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.py')) {
                pys++
            }
        }
    }()

    // check if Java, based on pom.xml, etc.
    const java = function(){
        if (existsSync(join(repository, 'pom.xml'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.java')) {
                javas++
            }
        }
    }()

    // check if C++, based on CMakeLists.txt, etc.
    const cpp = function(){
        if (existsSync(join(repository, 'CMakeLists.txt'))) {
            return true
        }
        if (existsSync(join(repository, 'Makefile'))) {
            return true
        }
        if (existsSync(join(repository, 'Makefile.am'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.cpp')) {
                cpps++
            } else if (file.endsWith('.h')) {
                cpps++
            } else if (file.endsWith('.hpp')) {
                cpps++
            }
        }
    }()

    // check if JavaScript, based on package.json, etc.
    const javascript = function(){
        if (existsSync(join(repository, 'package.json'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.js')) {
                jss++
            } else if (file.endsWith('.jsx')) {
                jss++
            } else if (file.endsWith('.ts')) {
                jss++
            }
        }
    }()

    // check if Go, based on go.mod, etc.
    const go = function(){
        if (existsSync(join(repository, 'go.mod'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.go')) {
                gos++
            }
        }
    }()

    // check if Rust, based on Cargo.toml, etc.
    const rust = function(){
        if (existsSync(join(repository, 'Cargo.toml'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.rs')) {
                rusts++
            }
        }
    }()

    // check if PHP, based on composer.json, etc.
    const php = function(){
        if (existsSync(join(repository, 'composer.json'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.php')) {
                phps++
            }
        }
    }()

    // check if Ruby, based on Gemfile, etc.
    const ruby = function(){
        if (existsSync(join(repository, 'Gemfile'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.rb')) {
                rubys++
            }
        }
    }()

    // check if C#, based on .csproj, etc.
    const csharp = function(){
        if (existsSync(join(repository, '.csproj'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.cs')) {
                csharps++
            }
        }
    }()

    // check if C, based on Makefile, etc.
    const c = function(){
        if (existsSync(join(repository, 'Makefile'))) {
            return true
        }
        if (existsSync(join(repository, 'Makefile.am'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.c')) {
                cs++
            }
        }
    }()

    // check if Swift, based on Package.swift, etc.
    const swift = function(){
        if (existsSync(join(repository, 'Package.swift'))) {
            return true
        }
        for (const file of files) {
            if (file.endsWith('.swift')) {
                swifts++
            }
        }
    }()

    // check if Shell, based on .sh, etc.
    const shell = function(){
        for (const file of files) {
            if (file.endsWith('.sh')) {
                shells++
            } else if (file.endsWith('.bash')) {
                shells++
            } else if (file.endsWith('.zsh')) {
                shells++
            } else if (file.endsWith('.fish')) {
                shells++
            }
        }
    }()

    // check if HTML, based on .html, etc.
    const html = function(){
        for (const file of files) {
            if (file.endsWith('.html')) {
                htmls++
            }
        }
    }()

    // check if Markdown, based on .md, etc.
    const md = function(){
        for (const file of files) {
            if (file.endsWith('.md')) {
                mds++
            }
        }
    }()

    // return top 3 languages
    const rank = [
        ['Python', pys],
        ['Java', javas],
        ['C++', cpps],
        ['JavaScript', jss],
        ['Go', gos],
        ['Rust', rusts],
        ['PHP', phps],
        ['Ruby', rubys],
        ['C#', csharps],
        ['C', cs],
        ['Shell', shells],
        ['HTML', htmls],
        ['Markdown', mds],
        ['Swift', swifts],
    ].sort((a, b) => b[1] as number - (a[1] as number))
    for (const r of rank) {
        if (r[1] as number > 0) {
            languages.push(r[0] as string)
        }
    }

    if (python && !languages.includes('Python')) {
        languages.push('Python')
    }
    if (java && !languages.includes('Java')) {
        languages.push('Java')
    }
    if (cpp && !languages.includes('C++')) {
        languages.push('C++')
    }
    if (javascript && !languages.includes('JavaScript')) {
        languages.push('JavaScript')
    }
    if (go && !languages.includes('Go')) {
        languages.push('Go')
    }
    if (rust && !languages.includes('Rust')) {
        languages.push('Rust')
    }
    if (php && !languages.includes('PHP')) {
        languages.push('PHP')
    }
    if (ruby && !languages.includes('Ruby')) {
        languages.push('Ruby')
    }
    if (csharp && !languages.includes('C#')) {
        languages.push('C#')
    }
    if (c && !languages.includes('C')) {
        languages.push('C')
    }
    if (swift && !languages.includes('Swift')) {
        languages.push('Swift')
    }

    resolve(languages)
})