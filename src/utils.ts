import { existsSync, lstat, readFile, readdir } from "fs"
import { join, resolve } from "path"
import * as vscode from "vscode"

export class ObservableMap<K, V> extends Map<K, V> {
    private onAddListeners: Map<string, (key: K, value: V) => void> = new Map()
    
    addOnAddListener(listenerName: string, listener: (key: K, value: V) => void) {
        this.onAddListeners.set(listenerName, listener)
    }
    
    removeOnAddListener(listenerName: string) {
        this.onAddListeners.delete(listenerName)
    }
    
    set(key: K, value: V) {
        super.set(key, value)
        this.onAddListeners.forEach((listener) => {
            listener(key, value)
        })
        return this
    }
}

export class TreeNode<K, T> {
    key: K
    value: T
    children: TreeNode<K, T>[] = []

    constructor(key: K, value: T) {
        this.key = key
        this.value = value
    }

    public addChild(child: TreeNode<K, T>) {
        this.children.push(child)
    }

    public hasChild(key: K) {
        return this.children.find(child => child.key === key) !== undefined
    }
}

export const findLanguage = (repository: string) => new Promise<string[]>(resolve => {
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

export const getReadme = (repository: string) => new Promise<string>(async resolve => {
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
    resolve(readme)
})

export const withLoading = (context: (feedback: (progress: number, message?: string) => void) => Promise<any>) => new Promise<void>(async resolve => {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Echidna',
        cancellable: false
    }, async (progress, token) => {
        token.onCancellationRequested(() => {
            console.log("User canceled the long running operation")
        })

        const feedback = (_progress: number, message?: string) => {
            progress.report({ increment: _progress, message: message })
        }

        await context(feedback)
        resolve()
    })
})

export const errorMessageEvent = (message: string) => {
    vscode.window.showErrorMessage(message)
}

export const infoMessageEvent = (message: string) => {
    vscode.window.showInformationMessage(message)
}