import { appendFileSync, existsSync, readFileSync } from "fs";
import path = require("path");

import Ignore from "ignore";

import {
  Uri,
  CancellationToken,
  FileDecorationProvider,
  FileDecoration,
  EventEmitter,
  Event,
  window,
  workspace,
  ThemeColor,
  FileType,
} from "vscode";

export class DecorationProvider implements FileDecorationProvider {
  private readonly _onDidChangeFileDecorations: EventEmitter<Uri | Uri[]> =
    new EventEmitter<Uri | Uri[]>();
  readonly onDidChangeFileDecorations: Event<Uri | Uri[]> =
    this._onDidChangeFileDecorations.event;
  private markedFiles: Set<string> = new Set<string>();
  private output = window.createOutputChannel("Mark Files");
  private scopeFilesByProjectRootsURIs: { [scopeUri: string]: string } = {}; //project root URI --> scope file URIs

  constructor() {
    this.loadFromScopeFile();
  }

  async markOrUnmark(uri: Uri) {
    const stat = await workspace.fs.stat(uri);

    if (stat.type !== FileType.File) {
      return;
    } //can't mark directory

    const { fsPath } = uri;

    if (this.markedFiles.has(fsPath)) {
      this.update([], [fsPath]);
      this.appendToScopeFile(`!${fsPath}\n`);
    } else {
      this.update([fsPath], []);
      this.appendToScopeFile(`${fsPath}\n`);
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
  public async update(
    markedFiles: Array<string>,
    unmarkedFiles: Array<string> = []
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
      this.scopeFilesByProjectRootsURIs[rf] = scopeFilePath;
    }

    for (const wsURI in this.scopeFilesByProjectRootsURIs) {
      const scopeFileURI = this.scopeFilesByProjectRootsURIs[wsURI];
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
    const ignore = Ignore();

    try {
      const patterns = readFileSync(scopeUri, `utf8`);
      ignore.add(patterns);

      this.output.appendLine(
        `Loaded patterns from ${scopeUri}:\n\n${patterns}`
      );
    } catch (err) {
      this.output.appendLine(
        `markfiles: Failed to read file with path ${scopeUri} from disk. err: ${err}`
      );
    }

    const markedFiles = (await workspace.findFiles(`**/*`))
      .map((uri) =>
        // Ignore needs the file paths to be relative.
        path.relative(projectRootUri, uri.fsPath)
      )
      .filter((filePath) => ignore.ignores(filePath))
      .map((filePath) => path.resolve(projectRootUri, filePath));

    this.update(markedFiles);
  }

  //write marked files to `scope` file in workspace root
  private async appendToScopeFile(pattern: string) {
    if (!Object.keys(this.scopeFilesByProjectRootsURIs).length) {
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
      const path = this.scopeFilesByProjectRootsURIs[workspaceUri];

      try {
        appendFileSync(path, pattern);
      } catch (exception) {
        console.error(
          `markfiles: Failed to write scope file with path ${path}. Err: ${exception}`
        );
      }
    }
  }
}
