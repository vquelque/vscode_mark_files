import * as vscode from 'vscode';
import * as fs from 'fs';
import { DecorationProvider } from './fileDecorationProvider';

var provider: DecorationProvider;

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

	//register the decoration provider
	provider = new DecorationProvider();
	let disposable = vscode.window.registerFileDecorationProvider(provider);
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('marfiles.markUnmarkFile', async (uri: vscode.Uri) => {
		if (uri) {
			const stat = fs.lstatSync(uri.fsPath);
			if (stat.isDirectory()) {return;}
			if (provider.markedFiles.has(uri.fsPath)) {
				provider.update([], [uri.fsPath]);
			} else {
				provider.update([uri.fsPath], []);
			}
		}
	});
	context.subscriptions.push(disposable);

	//listen to configuration changes
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('markfiles')) {
			provider.configChanged();
		}});
	context.subscriptions.push(disposable);

	console.log('extension is running');
}

// This method is called when the extension is deactivated
export function deactivate() {}