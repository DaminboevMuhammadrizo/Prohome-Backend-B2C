import { Injectable, Logger } from "@nestjs/common";
import { Response } from "express";
import { existsSync, mkdirSync } from 'fs';
import { readFile, stat, writeFile } from 'fs/promises';
import { extname, join } from "path";
import { getPathInFileType, headerDataStream } from "src/common/types/generator.types";
import { toOptimizedWebp } from "src/common/utils/image.util";

// Shu hajmdan katta rasm fayli (hali siqilmagan — masalan optimizatsiyadan
// OLDIN yuklangan eski rasm) birinchi so'ralganda avtomatik webp'ga siqiladi.
// Kichik (allaqachon optimal) rasmlarga tegilmaydi — CPU behuda sarflanmasin.
const COMPRESS_THRESHOLD_BYTES = 150 * 1024; // 150KB

// Animatsiyani (GIF) va vektorni (SVG) sharp to'g'ri saqlay olmaydi/aylantirib
// qo'yishi mumkin — shular optimallashtirilmaydi, asl holida xizmat qilinadi.
const OPTIMIZABLE_EXT = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.jfif', '.pjpeg', '.pjp', '.webp'];

@Injectable()
export class FileStreamService {
    private readonly logger = new Logger(FileStreamService.name);

    async fileStream(
        res: Response,
        fileName: string,
    ) {
        const dir = getPathInFileType(fileName);
        const originalPath = join(dir, fileName);
        if (!existsSync(originalPath)) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const ext = extname(fileName).toLowerCase();
        if (!OPTIMIZABLE_EXT.includes(ext)) {
            return headerDataStream(res, originalPath, fileName);
        }

        const optimized = await this.getOptimizedImage(dir, fileName, originalPath);
        return headerDataStream(res, optimized.path, optimized.fileName);
    }

    // Rasm uchun: oldin siqib keshlangan versiyasi bo'lsa — o'shani qaytaradi
    // (hech qanday qayta ishlov — tez). Bo'lmasa va asl fayl
    // COMPRESS_THRESHOLD_BYTES dan katta bo'lsa — bir martalik siqib, `.optimized`
    // pastki papkasiga yozadi; keyingi har bir so'rov to'g'ridan shu keshdan
    // o'qiydi. Fayl nomi `.webp` bilan qaytadi — Content-Type to'g'ri aniqlansin.
    private async getOptimizedImage(
        dir: string,
        fileName: string,
        originalPath: string,
    ): Promise<{ path: string; fileName: string }> {
        const cacheDir = join(dir, '.optimized');
        const cachePath = join(cacheDir, `${fileName}.webp`);

        if (existsSync(cachePath)) {
            return { path: cachePath, fileName: `${fileName}.webp` };
        }

        try {
            const { size } = await stat(originalPath);
            if (size <= COMPRESS_THRESHOLD_BYTES) {
                return { path: originalPath, fileName };
            }

            const buffer = await readFile(originalPath);
            const optimizedBuffer = await toOptimizedWebp(buffer);
            if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
            await writeFile(cachePath, optimizedBuffer);
            this.logger.log(`Eski rasm siqildi: ${fileName} (${(size / 1024).toFixed(0)}KB → ${(optimizedBuffer.length / 1024).toFixed(0)}KB)`);
            return { path: cachePath, fileName: `${fileName}.webp` };
        } catch (e) {
            this.logger.warn(`Rasmni siqib bo'lmadi (${fileName}): ${(e as Error).message}`);
            return { path: originalPath, fileName };
        }
    }
}
