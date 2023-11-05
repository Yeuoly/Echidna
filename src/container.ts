import * as vscode from 'vscode'

export class EchidnaDataProvider implements vscode.TreeDataProvider<EchidnaUser> {
    constructor(
    ) { }

	private _onDidChangeTreeData: vscode.EventEmitter<EchidnaUser | undefined | null | void> = new vscode.EventEmitter<EchidnaUser | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EchidnaUser | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh() {
        this._onDidChangeTreeData.fire();
    }

	getTreeItem(element: EchidnaUser): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            label: element.name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: 'echidna.helloWorld',
                title: '',
                arguments: [
                    element
                ]
            }
        };
	}

	getChildren(element?: EchidnaUser | undefined): vscode.ProviderResult<EchidnaUser[]> {
        if (!element) {
            return Promise.resolve(
                [
                    new EchidnaUser("test", "asd")
                ]
            );
        }
	}
}

class EchidnaUser {
    constructor(
        public name: string,
        public email: string
    ) { }
}