"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecorationProvider = void 0;
const path = require("path");
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
const fs_1 = require("fs");
class DecorationProvider {
    constructor() {
        this._onDidChangeFileDecorations = new vscode_1.EventEmitter();
        this.onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;
        this.markedFiles = new Set();
        this.scopeFilesByProjetRootsURIs = {}; //project root URI --> scope file URIs
        this.loadFromScopeFile();
    }
    provideFileDecoration(uri, token) {
        if (token.isCancellationRequested) {
            return {};
        }
        const config = vscode_1.workspace.getConfiguration('markfiles');
        const colorize = config.colorMarkedFile === 'color' || config.colorMarkedFile === 'both';
        const icon = config.colorMarkedFile === 'icon' || config.colorMarkedFile === 'both';
        if (this.markedFiles.has(uri.fsPath)) {
            return {
                propagate: true,
                badge: icon && config.markedFileIcon,
                tooltip: 'This file is marked',
                color: colorize && new vscode_1.ThemeColor('markfiles.markedFileColor'),
            };
        }
        return {};
    }
    //mark or unmark files
    async update(markedFiles, unmarkedFiles) {
        markedFiles.forEach((markedFile) => {
            if (!this.markedFiles.has(markedFile)) {
                this.markedFiles.add(markedFile);
                this._onDidChangeFileDecorations.fire(vscode_1.Uri.file(markedFile));
            }
        });
        unmarkedFiles.forEach((unmarkedFile) => {
            if (this.markedFiles.delete(unmarkedFile)) {
                this._onDidChangeFileDecorations.fire(vscode_1.Uri.file(unmarkedFile));
            }
        });
        this.writeMarkedFilesToFile();
    }
    async loadFromScopeFile(reload = false) {
        if (reload) {
            this.markedFiles.forEach((markedFile) => {
                this.markedFiles.delete(markedFile);
                this._onDidChangeFileDecorations.fire(vscode_1.Uri.file(markedFile));
            });
        }
        const rootFolders = vscode_1.workspace.workspaceFolders?.map((folder) => folder.uri.path);
        if (!rootFolders) {
            return;
        }
        for (const rf of rootFolders) {
            const scopeFilePath = path.join(rf, 'scope.txt');
            this.scopeFilesByProjetRootsURIs[rf] = scopeFilePath;
        }
        for (const wsURI in this.scopeFilesByProjetRootsURIs) {
            const scopeFileURI = this.scopeFilesByProjetRootsURIs[wsURI];
            if ((0, fs_1.existsSync)(scopeFileURI)) {
                this.loadMarkedFiles(scopeFileURI, wsURI); //load marked files from `scope` file in workspace root
            }
        }
    }
    async configChanged() {
        this.markedFiles.forEach((markedFile) => this._onDidChangeFileDecorations.fire(vscode_1.Uri.file(markedFile)));
    }
    async loadMarkedFiles(scopeUri, projectRootUri) {
        let markedRelPath = (await (0, utils_1.asyncReadFile)(scopeUri)) || [];
        let markedAbsPath = markedRelPath
            .filter((p) => p.length > 0)
            .map((relPath) => path.resolve(projectRootUri, relPath));
        this.update(markedAbsPath, []);
    }
    //write marked files to `scope` file in workspace root
    async writeMarkedFilesToFile() {
        if (!Object.keys(this.scopeFilesByProjetRootsURIs).length) {
            return;
        }
        // sort by workspace folders
        const markedFilesByWS = Array.from(this.markedFiles).reduce((acc, uri) => {
            const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.parse(uri));
            if (workspaceFolder) {
                if (!acc[workspaceFolder.uri.fsPath]) {
                    acc[workspaceFolder.uri.fsPath] = [uri];
                }
                else {
                    acc[workspaceFolder.uri.fsPath].push(uri);
                }
            }
            return acc;
        }, {});
        for (const workspaceUri in markedFilesByWS) {
            const markedFiles = markedFilesByWS[workspaceUri].join('\n');
            (0, fs_1.writeFile)(this.scopeFilesByProjetRootsURIs[workspaceUri], markedFiles, { flag: 'w' }, (err) => console.log(err));
        }
    }
}
exports.DecorationProvider = DecorationProvider;
//# sourceMappingURL=fileDecorationProvider.js.map