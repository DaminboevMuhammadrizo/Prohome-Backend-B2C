import { existsSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { getPathInFileType } from "./generator.types";

export function unlinkFile(filePathFromFront: string) {
    try {
        const filename = basename(filePathFromFront);

        const fullPath = join(getPathInFileType(filename), filename);

        if (existsSync(fullPath)) {
            unlinkSync(fullPath);
            console.log("File deleted ✅");
        } else {
            console.log("File not found ❌");
        }
    } catch (error) {
        console.log("File delete error:", error);
    }
}
