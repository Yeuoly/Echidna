import * as vscode from 'vscode';
import { EchidnaDataProvider } from './container';


export function activate(context: vscode.ExtensionContext) {
	const rootPath =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined
	if (!rootPath) {
		return
	}
	const echidnaDataProvider = new EchidnaDataProvider(rootPath)
	vscode.window.registerTreeDataProvider('echidna', echidnaDataProvider)
}

export function deactivate() {}
