import * as vscode from 'vscode'
import simpleGit, { SimpleGit } from 'simple-git'
import { EchidnaUser, EchidnaUserFile, GitLogFile, gitUsers } from './helper'
import { TreeNode } from './utils'

export class EchidnaElement {
    public isUser: boolean = false
    public isFile: boolean = false
    public user: EchidnaUser | undefined
    public file: TreeNode<string, EchidnaUserFile> | undefined

    public allowCollapse() {
        if (this.isUser) {
            return true
        }
        if (this.isFile) {
            return this.file?.children.length !== 0
        }
    }
}

export class EchidnaDataProvider implements vscode.TreeDataProvider<EchidnaElement> {
    private git: SimpleGit

    constructor(workspace: string) {
        this.git = simpleGit(workspace)
    }

	private _onDidChangeTreeData: vscode.EventEmitter<EchidnaElement | undefined | null | void> = new vscode.EventEmitter<EchidnaElement | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EchidnaElement | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh() {
        this._onDidChangeTreeData.fire();
    }

	getTreeItem(element: EchidnaElement): vscode.TreeItem | Thenable<vscode.TreeItem> {
        if (element.isUser) {
            return {
                label: element.user?.name,
                collapsibleState: element.allowCollapse() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                tooltip: element.user?.email,
                description: `${element.user?.commits} commits, ${element.user?.additions} additions, ${element.user?.files.size} files`,
                iconPath: new vscode.ThemeIcon('account', new vscode.ThemeColor('gitDecoration.addedResourceForeground'))
            }
        } else if (element.isFile) {
            if (element.allowCollapse()) {
                return {
                    label: element.file?.key,
                    collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                    description: `${element.file?.value.additions} additions, ${element.file?.value.deletions} deletions`,
                    iconPath: new vscode.ThemeIcon('file-directory')
                }
            }
            const file = element.user?.files.get(element.file?.value.name || '')
            return {
                label: element.file?.key,
                collapsibleState: vscode.TreeItemCollapsibleState.None,
                description: `${file?.additions} additions, ${file?.deletions} deletions`,
                iconPath: new vscode.ThemeIcon('file')
            }
        } else {
            return {
                label: 'Echidna',
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                description: 'Echidna is a VSCode extension that shows you the git contributions of your team members.',
            }
        }
	}

	getChildren(element?: EchidnaElement | undefined): vscode.ProviderResult<EchidnaElement[]> {
        if (!element) {
            return Promise.resolve(
                new Promise<EchidnaElement[]>((resolve, reject) => {
                    gitUsers(this.git).then(users => {
                        resolve(users.map(user => {
                            let e = new EchidnaElement()
                            e.isUser = true
                            e.user = user
                            return e
                        }))
                    })
                })
            );
        } else if (element.isUser) {
            return Promise.resolve(
                new Promise<EchidnaElement[]>((resolve, reject) => {
                    if (element.user) {
                        resolve(Array.from(element.user.fileTree.children).map(file => {
                            let e = new EchidnaElement()
                            e.isFile = true
                            e.file = file
                            e.user = element.user
                            return e
                        }))
                    } else {
                        reject()
                    }
                })
            )
        } else if (element.isFile) {
            return Promise.resolve(
                new Promise<EchidnaElement[]>((resolve, reject) => {
                    if (element.file) {
                        resolve(Array.from(element.file.children).map(file => {
                            let e = new EchidnaElement()
                            e.isFile = true
                            e.file = file
                            e.user = element.user
                            return e
                        }))
                    } else {
                        reject()
                    }
                })
            )
        }
	}
}
