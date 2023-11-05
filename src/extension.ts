import * as vscode from 'vscode';
import { EchidnaDataProvider } from './container';


export function activate(context: vscode.ExtensionContext) {
	const echidnaDataProvider = new EchidnaDataProvider();
	vscode.window.registerTreeDataProvider('echidna', echidnaDataProvider);
}

export function deactivate() {}
