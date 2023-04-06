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
} from "vscode";
import { asyncReadFile } from "./utils";
import { existsSync, writeFile } from "fs";

export class DecorationProvider implements FileDecorationProvider {
  private readonly _onDidChangeFileDecorations: EventEmitter<Uri | Uri[]> =
    new EventEmitter<Uri | Uri[]>();
  readonly onDidChangeFileDecorations: Event<Uri | Uri[]> =
    this._onDidChangeFileDecorations.event;
  public markedFiles: Set<string> = new Set<string>();
  private scopeFilesByProjetRootsURIs: { [scopeUri: string]: string } = {}; //project root URI --> scope file URIs

  constructor() {
    this.loadFromScopeFile();
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
  public async update(
    markedFiles: Array<string>,
    unmarkedFiles: Array<string>
  ) {
    if (!markedFiles.length && !unmarkedFiles.length) {
      return;
    }
    markedFiles.forEach((markedFile) => {
      if (!this.markedFiles.has(markedFile)) {
        this.markedFiles.add(markedFile);
        this._onDidChangeFileDecorations.fire(Uri.file(markedFile));
      }
    });
    unmarkedFiles.forEach((unmarkedFile) => {
      if (this.markedFiles.delete(unmarkedFile)) {
        this._onDidChangeFileDecorations.fire(Uri.file(unmarkedFile));
      }
    });
    this.writeMarkedFilesToFile();
  }

  public async loadFromScopeFile(reload: boolean = false) {
    if (reload) {
      this.markedFiles.forEach((markedFile) => {
        this.markedFiles.delete(markedFile);
        this._onDidChangeFileDecorations.fire(Uri.file(markedFile));
      });
    }
    const rootFolders = workspace.workspaceFolders?.map(
      (folder) => folder.uri.path
    );
    if (!rootFolders) {
      return;
    }
    for (const rf of rootFolders) {
      const scopeFilePath = path.join(rf, "scope.txt");
      this.scopeFilesByProjetRootsURIs[rf] = scopeFilePath;
    }

    for (const wsURI in this.scopeFilesByProjetRootsURIs) {
      const scopeFileURI = this.scopeFilesByProjetRootsURIs[wsURI];
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
    let markedRelPath = (await asyncReadFile(scopeUri)) || [];
    let markedAbsPath = markedRelPath
      .filter((p) => p.length > 0)
      .map((relPath) => path.resolve(projectRootUri, relPath));
    //.filter(async (p) => await (await workspace.fs.stat(Uri.parse(p))).type === FileType.File)
    this.update(markedAbsPath, []);
  }

  //write marked files to `scope` file in workspace root
  private async writeMarkedFilesToFile() {
    if (!Object.keys(this.scopeFilesByProjetRootsURIs).length) {
      return;
    }
    // sort by workspace folders
    const markedFilesByWS = Array.from(this.markedFiles).reduce<{
      [key: string]: string[];
    }>((acc: { [key: string]: string[] }, uri: string) => {
      const workspaceFolder = workspace.getWorkspaceFolder(Uri.parse(uri));
      if (workspaceFolder) {
        if (!acc[workspaceFolder.uri.fsPath]) {
          acc[workspaceFolder.uri.fsPath] = [uri];
        } else {
          acc[workspaceFolder.uri.fsPath].push(uri);
        }
      }
      return acc;
    }, {});

    for (const workspaceUri in markedFilesByWS) {
      const markedFiles = markedFilesByWS[workspaceUri].join("\n");
      const path = this.scopeFilesByProjetRootsURIs[workspaceUri];
      writeFile(path, markedFiles, { flag: "w" }, (err) => {
        if (err) {
          console.error(
            `markfiles: Failed to write scope file with path ${path}. Err: ${err}`
          );
        }
      });
    }
  }
}
