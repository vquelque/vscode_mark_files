import * as vscode from "vscode";
import { DecorationProvider } from "./fileDecorationProvider";

var provider: DecorationProvider;

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  //register the decoration provider
  provider = new DecorationProvider();
  let disposable = vscode.window.registerFileDecorationProvider(provider);
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "markfiles.markUnmarkFile",
    async (contextUri: vscode.Uri) => {
      const uri = contextUri || vscode.window.activeTextEditor?.document.uri;
      if (uri) {
        provider.markOrUnmark(uri);
      }
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "markfiles.reloadFromScopeFile",
    async () => {
      provider.loadFromScopeFile(true);
      vscode.window.showInformationMessage(
        "Loading marked files from scope file(s)"
      );
    }
  );
  context.subscriptions.push(disposable);

  //listen to configuration changes
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("markfiles")) {
      provider.configChanged();
    }
  });
  context.subscriptions.push(disposable);
}

// This method is called when the extension is deactivated
export function deactivate() {}
