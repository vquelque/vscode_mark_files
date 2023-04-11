import * as markFilesProvider from "../../fileDecorationProvider";
import * as vscode from "vscode";
import path = require("path");
import { extension, createTestFile, removeTestFile } from "../utils";

suite("Provider Test Suite", () => {
  let provider: markFilesProvider.DecorationProvider;
  let exampleFilesUris: vscode.Uri[];
  let extensionContext: vscode.ExtensionContext;

  //   suiteSetup(async () => {
  //     provider = new markFilesProvider.DecorationProvider();
  //     const exampleFiles = ["file1.txt", "file2.txt"].map((fname) =>
  //       path.resolve(__dirname, "../example", fname)
  //     );
  //     exampleFilesUris = exampleFiles.map((p) => vscode.Uri.file(p));
  //   });

  suiteSetup(async () => {
    await createTestFile("file3.html");
    extensionContext = await extension.activate();
  });

  test("Test mark file", async () => {
    await vscode.commands.executeCommand("markfiles.markUnmarkSelectedFile");
    // await vscode.commands.executeCommand('markfiles.writeMarkedFilesToDisk');
    console.log("keys : \n");
    console.log(extensionContext);
  });

  suiteTeardown(async () => {
    await removeTestFile();
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
