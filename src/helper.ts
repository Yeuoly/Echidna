import { SimpleGit } from "simple-git"
import { ObservableMap, TreeNode } from "./utils"
import { getRepositoryUserCommits } from "./cache"

export class GitLogFile {
    constructor(
        public name: string,
        public additions: number,
        public deletions: number
    ) { }
}

export class GitLog {
    constructor(
        public name: string,
        public email: string,
        public date: Date,
        public message: string,
        public hash: string,
        public isMerge: boolean,
        public additions: number,
        public deletions: number,
        public files: Map<string, GitLogFile>
    ) { }
}

export class EchidnaUserFile {
    constructor(
        public name: string,
        public additions: number,
        public deletions: number
    ) { }
}

export class EchidnaUser {
    public commits: number = 0
    public additions: number = 0
    public deletions: number = 0
    public files: ObservableMap<string, EchidnaUserFile> = new ObservableMap<string, EchidnaUserFile>()
    public fileTree: TreeNode<string, EchidnaUserFile> = new TreeNode<string, EchidnaUserFile>('root', new EchidnaUserFile('root', 0, 0))
    public logs: GitLog[] = []

    constructor(
        public name: string,
        public email: string
    ) {
    }

    public refreshTree() {
        // build tree
        this.fileTree = new TreeNode<string, EchidnaUserFile>('root', new EchidnaUserFile('root', 0, 0))
        for (const file of this.files) {
            const path = file[0].split('/')
            let node = this.fileTree
            for (const p of path) {
                node.value.additions += file[1].additions
                node.value.deletions += file[1].deletions
                if (node.hasChild(p)) {
                    node = node.children.find(v => v.key === p) as TreeNode<string, EchidnaUserFile>
                } else {
                    const new_node = new TreeNode<string, EchidnaUserFile>(p, new EchidnaUserFile(p, 0, 0))
                    node.addChild(new_node)
                    node = new_node
                }
            }
            node.value = file[1]
        }
    }
}

let logs: GitLog[] = []

/**
 * returns (
 *  logs: GitLog[],
 *  isLatest: boolean
 * )
 */
export const gitLog = async (git: SimpleGit) => new Promise<{
    logs: GitLog[],
    isLatest: boolean
}>((resolve, reject) => {
    // check if logs is empty
    if (logs.length > 0) {
        // check if logs is latest
        let isLatest = true
        git.log({ maxCount: 1 }, (err, log) => {
            console.log(log)
        })

        if (isLatest) {
            resolve({
                logs,
                isLatest: true
            })
            return
        }
    }

    const latest_logs: GitLog[] = [];
    // list all logs, including username, email, date, message, hash, isMerge, additions, deletions, files
    git.raw(['log', '--pretty="%H-##-%an-##-%ae-##-%ad-##-%s"', '--numstat']).then(log => {
        log.split('\n').forEach(line => {
            if (line.startsWith('"')) {
                const commit = line.replace(/"/g, '').split('-##-')
                const hash = commit[0]
                const name = commit[1]
                const email = commit[2]
                const date = new Date(commit[3])
                const message = commit[4]
                const isMerge = message.startsWith('Merge')
                latest_logs.push(new GitLog(name, email, date, message, hash, isMerge, 0, 0, new Map<string, GitLogFile>()))
            } else if (line.match(/\d+\t\d+\t.*/)) {
                const commit = latest_logs[latest_logs.length - 1]
                const commit_info = line.split('\t')
                commit.additions += parseInt(commit_info[0])
                commit.deletions += parseInt(commit_info[1])
                // check if file exists
                if (commit.files.has(commit_info[2])) {
                    const file = commit.files.get(commit_info[2])
                    if (file) {
                        file.additions += parseInt(commit_info[0])
                        file.deletions += parseInt(commit_info[1])
                    }
                } else {
                    commit.files.set(commit_info[2], new GitLogFile(commit_info[2], parseInt(commit_info[0]), parseInt(commit_info[1])))
                }
            } else {
                // do nothing
            }
        })
    }).finally(() => {
        logs = latest_logs
        resolve({
            logs,
            isLatest: false
        })
    })
})

const users = new Map<string, EchidnaUser>();

export const gitUsers = async (git: SimpleGit) => new Promise<EchidnaUser[]>(async (resolve, reject) => {
    const logs = await gitLog(git)
    if (logs.isLatest) {
        resolve(Array.from(users.values()))
    } else {
        logs.logs.forEach(log => {
            if (!users.has(log.name)) {
                const user = new EchidnaUser(log.name, log.email)
                users.set(log.name, user)
                user.logs.push(log)
                user.commits += 1
            } else {
                const user = users.get(log.name)
                if (user) {
                    user.logs.push(log)
                    user.commits += 1
                    user.additions += log.additions
                    user.deletions += log.deletions
                    log.files.forEach(file => {
                        if (user.files.has(file.name)) {
                            const user_file = user.files.get(file.name)
                            if (user_file) {
                                user_file.additions += file.additions
                                user_file.deletions += file.deletions
                            }
                        } else {
                            user.files.set(file.name, new EchidnaUserFile(file.name, file.additions, file.deletions))
                        }
                    })
                    user.refreshTree()
                }
            }
        })
        resolve(Array.from(users.values()))
    }
})

export const gitUser = async (username: string) => new Promise<EchidnaUser | undefined>(async (resolve, reject) => {
    const user = users.get(username)
    if (user) {
        resolve(user)
    } else {
        resolve(undefined)
    }
})

export const gitUserCommits = async (repository: string, username: string) => new Promise<GitLog[]>(async (resolve, reject) => {
    const user = users.get(username)
    if (user) {
        // get cache commits
        const commits = await getRepositoryUserCommits(repository, user.name)
        for (const log of user.logs) {
            if (log.hash in commits) {
                log.message = commits[log.hash]
            }
        }
        resolve(user.logs)
    } else {
        resolve([])
    }
})

export const todayUserCommits = async (repository: string, username: string) => new Promise<GitLog[]>(async (resolve, reject) => {
    const logs = await gitUserCommits(repository, username)
    const today = new Date()
    const today_logs: GitLog[] = []
    for (const log of logs) {
        if (log.date.getFullYear() === today.getFullYear() &&
            log.date.getMonth() === today.getMonth() &&
            log.date.getDate() === today.getDate()) {
            today_logs.push(log)
        }
    }

    resolve(today_logs)
})

/**
 * checkCommits checks if there is any commits which leak of enough information to summarize.
 */
export const checkCommits = async (repository: string, username: string) => new Promise<string[]>(async (resolve, reject) => {
    const logs = await gitUserCommits(repository, username)

    const leaks: string[] = []
    for (const log of logs) {
        if (log.message.split(/[\s,;:\"\']/g).length < 2) {
            leaks.push(log.hash)
        }
    }
    resolve(leaks)
})

export const getDiff = async (git: SimpleGit, hash: string) => new Promise<string>(async (resolve, reject) => {
    git.diff([`${hash}^..${hash}`], (err, diff) => {
        if (err) {
            resolve('')
        } else {
            resolve(diff)
        }
    })
})