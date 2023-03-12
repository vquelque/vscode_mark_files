"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const fileDecorationProvider_1 = require("./fileDecorationProvider");
var provider;
// This method is called when the extension is activated
function activate(context) {
    //register the decoration provider
    provider = new fileDecorationProvider_1.DecorationProvider();
    let disposable = vscode.window.registerFileDecorationProvider(provider);
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('markfiles.markUnmarkFile', async (contextUri) => {
        const uri = contextUri || vscode.window.activeTextEditor?.document.uri;
        if (uri) {
            const stat = fs.lstatSync(uri.fsPath);
            if (stat.isDirectory()) {
                return;
            }
            if (provider.markedFiles.has(uri.fsPath)) {
                provider.update([], [uri.fsPath]);
            }
            else {
                provider.update([uri.fsPath], []);
            }
        }
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('markfiles.reloadFromScopeFile', async () => {
        provider.loadFromScopeFile(true);
        vscode.window.showInformationMessage('Loading marked files from scope file(s)');
    });
    context.subscriptions.push(disposable);
    //listen to configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('markfiles')) {
            provider.configChanged();
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// This method is called when the extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map