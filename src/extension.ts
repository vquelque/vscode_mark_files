import * as vscode from 'vscode';
import { DecorationProvider } from './fileDecorationProvider';

var provider: DecorationProvider;

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

	//register the decoration provider
	provider = new DecorationProvider();
	let disposable = vscode.window.registerFileDecorationProvider(provider);
	context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.commands.registerCommand('markfiles.markUnmarkActiveFile', async (contextUri: vscode.Uri) => {
			const uri = vscode.window.activeTextEditor?.document.uri;
			if (uri) {
				const stat = await vscode.workspace.fs.stat(uri);
				if (stat.type !== vscode.FileType.File) {return;} //can't mark directory
				if (provider.markedFiles.has(uri.fsPath)) {
					provider.update([], [uri.fsPath]);
				} else {
					provider.update([uri.fsPath], []);
				}
			} 
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('markfiles.markUnmarkSelectedFile', async (clickedFile: vscode.Uri, selectedFiles: vscode.Uri[]) => {
			for (const uri of selectedFiles) {
				if (uri) {
					const stat = await vscode.workspace.fs.stat(uri);
					if (stat.type !== vscode.FileType.File) {continue;} //can't mark directory
					if (provider.markedFiles.has(uri.fsPath)) {
						provider.update([], [uri.fsPath]);
					} else {
						provider.update([uri.fsPath], []);
					}
				} 
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('markfiles.reloadFromScopeFile', async () => {
			provider.loadFromScopeFile(true);
			vscode.window.showInformationMessage('Loading marked files from scope file(s)');
		})
	);

	//listen to configuration changes
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('markfiles')) {
			provider.configChanged();
		}});
	context.subscriptions.push(disposable);

	
}

// This method is called when the extension is deactivated
export function deactivate() {}