import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiConsumes,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { MessageFileType } from '@prisma/client';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { memoryStorage } from 'multer';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { ChatQueryDto, SendMessageDto, StartChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';

const MAX_FILE_MB = 50;

function ensureUploadDir(subDir: string): string {
    const dest = join(process.cwd(), 'core', 'uploads', subDir);
    if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
    return dest;
}

function detectFileType(mimetype: string): MessageFileType {
    if (mimetype.startsWith('image/')) return MessageFileType.IMAGE;
    if (mimetype.startsWith('video/')) return MessageFileType.VIDEO;
    return MessageFileType.DOCUMENT;
}

function getSubDir(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'images';
    if (mimetype.startsWith('video/')) return 'videos';
    return 'docs';
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(GuardService)
@Controller('chats')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    // ─── Chatni boshlash (foydalanuvchi masterId bilan) ─────────────────────
    @Post()
    @ApiOperation({ summary: "Chat boshlash yoki mavjud chatni olish (USER → Usta)" })
    startChat(@UserData() user: JwtPayload, @Body() dto: StartChatDto) {
        return this.chatService.startChat(user, dto);
    }

    // ─── Foydalanuvchi chatlarini olish ─────────────────────────────────────
    @Get('my')
    @ApiOperation({ summary: "O'z chatlarim — USER yoki MASTER bo'lishi mumkin" })
    getMyChats(@UserData() user: JwtPayload, @Query() query: ChatQueryDto) {
        if (user.role === 'MASTER') {
            return this.chatService.getMasterChats(user, query);
        }
        return this.chatService.getUserChats(user, query);
    }

    // ─── Xabarlar ro'yxati ───────────────────────────────────────────────────
    @Get(':id/messages')
    @ApiOperation({ summary: "Chat xabarlari (oxirgidan birinchiga — sahifalangan)" })
    getMessages(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Query() query: ChatQueryDto,
    ) {
        return this.chatService.getMessages(id, user, query);
    }

    // ─── Xabar yuborish ──────────────────────────────────────────────────────
    @Post(':id/messages')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['image/', 'video/', 'application/', 'text/'];
            if (!allowed.some(t => file.mimetype.startsWith(t))) {
                return cb(new BadRequestException('Ruxsat etilmagan fayl turi'), false);
            }
            cb(null, true);
        },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: `Xabar yuborish — matn va/yoki fayl (rasm, video, hujjat, max ${MAX_FILE_MB}MB)` })
    async sendMessage(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Body() dto: SendMessageDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        let fileUrl: string | undefined;
        let fileType: MessageFileType | undefined;

        if (file) {
            const subDir = getSubDir(file.mimetype);
            const dir = ensureUploadDir(subDir);
            const filename = `${Date.now()}${extname(file.originalname)}`;
            await writeFile(join(dir, filename), file.buffer);
            fileUrl = `${subDir}/${filename}`;
            fileType = detectFileType(file.mimetype);
        }

        return this.chatService.sendMessage(id, user, dto.content, fileUrl, fileType);
    }
}
