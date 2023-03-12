"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncReadFile = void 0;
const fs_1 = require("fs");
async function asyncReadFile(path) {
    try {
        const contents = await fs_1.promises.readFile(path, 'utf-8');
        const arr = contents.split(/\r?\n/);
        return arr;
    }
    catch (err) {
        console.log("Failed to read file. err: " + err);
    }
}
exports.asyncReadFile = asyncReadFile;
//# sourceMappingURL=utils.js.map