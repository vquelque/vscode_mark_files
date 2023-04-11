import * as vscode from "vscode";
import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

const packageJSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../package.json"), "utf-8")
) as { name: string; publisher: string };

export const extension = vscode.extensions.getExtension(
  `${packageJSON.publisher}.${packageJSON.name}`
)! as vscode.Extension<any>;

assert.ok(extension);

export async function createTestFile(
  fileName: string,
  content: string = ""
): Promise<void> {
  const filePath = path.join(
    vscode.workspace.workspaceFolders![0].uri.fsPath,
    fileName
  );
  fs.writeFileSync(filePath, content);
  const uri = vscode.Uri.file(filePath);
  await vscode.window.showTextDocument(uri);
}

export async function removeTestFile(): Promise<void> {
  const uri = vscode.window.activeTextEditor?.document.uri as vscode.Uri;
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  await vscode.workspace.fs.delete(uri);
}
