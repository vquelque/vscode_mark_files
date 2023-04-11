import { promises as fsPromises } from "fs";

export async function asyncReadFile(path: string) {
  try {
    const contents = await fsPromises.readFile(path, "utf-8");

    const arr = contents.split(/\r?\n/);

    return arr;
  } catch (err) {
    console.error(
      `markfiles: Failed to read file with path ${path} from disk. err: ${err}`
    );
  }
}
