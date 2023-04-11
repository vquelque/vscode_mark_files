import path = require("path");
import {
  Uri,
  CancellationToken,
  FileDecorationProvider,
  FileDecoration,
  EventEmitter,
  Event,
  workspace,
  ThemeColor,
  FileType,
  window,
} from "vscode";
import { asyncReadFile } from "./utils";
import { existsSync, writeFile } from "fs";
import ignore from "ignore";
import { getStorage, printChannelOutput } from "./extension";

export class DecorationProvider implements FileDecorationProvider {
  private readonly _onDidChangeFileDecorations: EventEmitter<Uri | Uri[]> =
    new EventEmitter<Uri | Uri[]>();
  readonly onDidChangeFileDecorations: Event<Uri | Uri[]> =
    this._onDidChangeFileDecorations.event;
  public markedFiles: Set<string> = new Set<string>();

  constructor() {
    //try loading the existing marks
    if (!this.loadMarkedFilesFromWSStorage()) {
      //fallback to scope file if user config allows
      const config = workspace.getConfiguration("markfiles");
      config.autoloadFromScope && this.loadFromScopeFile();
    }
  }

  provideFileDecoration(uri: Uri, token: CancellationToken): FileDecoration {
    if (token.isCancellationRequested) {
      return {};
    }
    const config = workspace.getConfiguration("markfiles");
    const colorize =
      config.colorMarkedFile === "color" || config.colorMarkedFile === "both";
    const icon =
      config.colorMarkedFile === "icon" || config.colorMarkedFile === "both";
    if (this.markedFiles.has(uri.fsPath)) {
      return {
        propagate: true,
        badge: icon && config.markedFileIcon,
        tooltip: "This file is marked",
        color: colorize && new ThemeColor("markfiles.markedFileColor"),
      };
    }
    return {};
  }

  //mark or unmark files
  public async markOrUnmarkFiles(uris: Uri[]) {
    uris.forEach(async (uri) => {
      const stat = await workspace.fs.stat(uri);
      if (stat.type !== FileType.File) {
        console.log("can't mark directory");
        return; //can't mark directory
      }
      const fPath = uri.fsPath;
      if (this.markedFiles.has(uri.fsPath)) {
        this.markedFiles.delete(fPath);
        getStorage().update(fPath, undefined); //remove from WS storage
      } else {
        this.markedFiles.add(fPath);
        getStorage().update(fPath, true); // add to WS storage
      }
      this._onDidChangeFileDecorations.fire(uri);
    });
  }

  //reload marked files by reading the scope file
  //this clears exising marks
  public async loadFromScopeFile(reload: boolean = false) {
    const scopeFileUrisByFolder = this.getFileURIsByFolderForWS("scope", "txt");
    if (reload) {
      const confirm = await window.showInformationMessage(
        "This operation will clear all marked files. Do you want to continue?",
        "Yes",
        "No"
      );
      if (confirm === "No") {
        //abort
        return;
      }
      this.clearMarkedFilesForWS();
    }
    for (const wsURI in scopeFileUrisByFolder) {
      const scopeFileURI = scopeFileUrisByFolder[wsURI];
      if (existsSync(scopeFileURI)) {
        this.loadMarkedFiles(scopeFileURI, wsURI); //load marked files from `scope` file in workspace root
      }
    }
  }

  public async configChanged() {
    this.markedFiles.forEach((markedFile) =>
      this._onDidChangeFileDecorations.fire(Uri.file(markedFile))
    );
  }

  async loadMarkedFiles(scopeUri: string, projectRootUri: string) {
    let patterns = (await asyncReadFile(scopeUri)) || [];
    const ig = ignore().add(patterns);
    // find files in all workspace folders, and filter them according to the specified gitignore patterns
    // https://git-scm.com/docs/gitignore
    let markedAbsPath = (await workspace.findFiles("**/*"))
      .map((uri) => path.relative(projectRootUri, uri.fsPath))
      .filter((relPath) => ig.ignores(relPath))
      .map((relPath) => Uri.file(path.resolve(projectRootUri, relPath)));
    printChannelOutput(`Loaded patterns from ${scopeUri}`);
    this.markOrUnmarkFiles(markedAbsPath);
  }

  //write marked files to `scope` file in workspace root
  public async exportMarkedFilesToFile() {
    printChannelOutput("Exporting marked files to scope file");
    const fileName = await window.showInputBox({
      placeHolder: "File name",
      prompt: "Please enter a name for the exported file",
      value: "scope",
    });
    if (!fileName) {
      return;
    }
    const scopeFileUrisByFolder = this.getFileURIsByFolderForWS(
      fileName,
      "txt"
    );
    if (!Object.keys(scopeFileUrisByFolder).length) {
      printChannelOutput("No opened project - aborting");
      return;
    }
    // sort by workspace folders
    const markedFilesByWS = Array.from(this.markedFiles).reduce<{
      [key: string]: string[];
    }>((acc: { [key: string]: string[] }, uri: string) => {
      const workspaceFolder = workspace.getWorkspaceFolder(Uri.parse(uri));
      if (workspaceFolder) {
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri); //use relative URIs in the scope file
        if (!acc[workspaceFolder.uri.fsPath]) {
          acc[workspaceFolder.uri.fsPath] = [relativePath];
        } else {
          acc[workspaceFolder.uri.fsPath].push(relativePath);
        }
      }
      return acc;
    }, {});

    for (const workspaceUri in markedFilesByWS) {
      const markedFiles = markedFilesByWS[workspaceUri].join("\n");
      const path = scopeFileUrisByFolder[workspaceUri];

      try {
        await await workspace.fs.stat(Uri.file(path));
        const confirm = await window.showInformationMessage(
          "This operation will overwrite the existing scope file. Do you want to continue?",
          "Yes",
          "No"
        );
        if (confirm === "No") {
          //abort
          return;
        }
      } catch {
        //no existing file => continue
      }
      printChannelOutput(`Exporting marked files to file ${path}`);
      writeFile(path, markedFiles, { flag: "w" }, (err) => {
        if (err) {
          console.error(
            `markfiles: Failed to write scope file with path ${path}. Err: ${err}`
          );
        }
      });
    }
  }

  public handleFileRename(oldUri: Uri, newUri: Uri) {
    if (!this.markedFiles.has(oldUri.fsPath)) {
      return;
    }
    this.markedFiles.delete(oldUri.fsPath);
    getStorage().update(oldUri.fsPath, undefined);
    this.markedFiles.add(newUri.fsPath);
    getStorage().update(newUri.fsPath, true);
    this._onDidChangeFileDecorations.fire(newUri);
  }

  private loadMarkedFilesFromWSStorage(): boolean {
    if (!getStorage()) {
      return false;
    }
    const markedURIs = getStorage().keys();
    if (!markedURIs.length) {
      return false;
    }
    printChannelOutput(`Loaded files from workspace storage`);
    this.markOrUnmarkFiles(markedURIs.map((uri) => Uri.file(uri)));
    return true;
  }

  private clearMarkedFilesForWS() {
    this.markedFiles.forEach((markedFile) => {
      this.markedFiles.delete(markedFile);
      getStorage().update(markedFile, undefined);
      this._onDidChangeFileDecorations.fire(Uri.file(markedFile));
    });
  }

  /**
   * @param fileName: name of the file
   * @returns an array of URIs for files with name `fileName` for each folder in the workspace
   */
  private getFileURIsByFolderForWS(fileName: string, extension: string) {
    const scopeFilesByProjectRootsURIs: { [scopeUri: string]: string } = {};
    //iterate over all opened workspace folders
    const rootFolders = workspace.workspaceFolders?.map(
      (folder) => folder.uri.path
    );
    if (!rootFolders) {
      return {};
    }
    for (const rf of rootFolders) {
      const scopeFilePath = path.join(rf, fileName.concat(".", extension));
      scopeFilesByProjectRootsURIs[rf] = scopeFilePath;
    }
    return scopeFilesByProjectRootsURIs;
  }
}
