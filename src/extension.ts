import * as vscode from "vscode";
import { DecorationProvider } from "./fileDecorationProvider";

let provider: DecorationProvider;
let outputChannel: vscode.OutputChannel;
let storage: vscode.Memento;

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  //create WS storage
  storage = context.workspaceState;
  if (!storage) {
    vscode.window.showInformationMessage(
      "Please create a workspace to save the marked files"
    );
  }
  //initialize output channel
  outputChannel = vscode.window.createOutputChannel("Mark Files");

  //register the decoration provider
  provider = new DecorationProvider();
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markfiles.markUnmarkActiveFile",
      async (contextUri: vscode.Uri) => {
        const uri = vscode.window.activeTextEditor?.document.uri;
        if (uri) {
          provider.markOrUnmarkFiles([uri]);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markfiles.writeMarkedFilesToDisk",
      async () => {
        await provider.exportMarkedFilesToFile();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markfiles.markUnmarkSelectedFile",
      async (clickedFile: vscode.Uri, selectedFiles: vscode.Uri[]) => {
        provider.markOrUnmarkFiles(selectedFiles);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "markfiles.reloadFromScopeFile",
      async () => {
        provider.loadFromScopeFile(true);
        vscode.window.showInformationMessage(
          "Loading marked files from scope file(s)"
        );
      }
    )
  );

  context.subscriptions.push(
    //listen to configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("markfiles")) {
        provider.configChanged();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidRenameFiles(async (rename) => {
      if (rename.files.length === 0) {
        return;
      }

      for (const file of rename.files) {
        provider.handleFileRename(file.oldUri, file.newUri);
      }
    })
  );
  return context;
}

//print to the output channel
export const printChannelOutput = (content: string, reveal = false): void => {
  outputChannel.appendLine(content);
  if (reveal) {
    outputChannel.show(true);
  }
};

export const getStorage = () => {
  return storage;
};

// This method is called when the extension is deactivated
export function deactivate() {}
