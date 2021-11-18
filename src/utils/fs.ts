import fs from "fs";
import path from "path";
import { Future, FutureData } from "./future";

export function writeFile<Data>(file: string, contents: Data): FutureData<void> {
    return Future.fromComputation((resolve, reject) => {
        try {
            fs.writeFileSync(file, JSON.stringify(contents, null, 4));
            resolve();
        } catch (e) {
            reject(`Couldn't write file${file}: ${e}`);
        }

        return () => {};
    });
}

export function readFile<Data>(file: string, defaultContent: Data): FutureData<Data> {
    return Future.fromComputation((resolve, reject) => {
        try {
            const contents = fs.readFileSync(file).toString();
            resolve(JSON.parse(contents) as Data);
        } catch (e: any) {
            if (e.message.indexOf("ENOENT") !== -1) {
                resolve(defaultContent);
            } else {
                reject(`Couldn't read file${file}: ${e}`);
            }
        }

        return () => {};
    });
}

export function joinPath(...paths: string[]): string {
    return path.join(...paths);
}
