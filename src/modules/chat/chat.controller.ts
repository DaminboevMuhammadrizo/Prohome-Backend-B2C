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
import { toOptimizedWebp } from 'src/common/utils/image.util';
import { UserData } from 'src/common/decorators/auth.decorators';
import { GuardService } from 'src/common/guard/guard.service';
import type { JwtPayload } from 'src/common/config/jwt/jwt.service';
import { ChatQueryDto, SendMessageDto, StartChatDto } from './dto/chat.dto';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';

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
    constructor(
        private readonly chatService: ChatService,
        private readonly chatGateway: ChatGateway,
    ) {}

    // ─── Chatni boshlash ─────────────────────────────────────────────────────
    @Post()
    @ApiOperation({ summary: "Chat boshlash yoki mavjud chatni olish (USER → Usta)" })
    startChat(@UserData() user: JwtPayload, @Body() dto: StartChatDto) {
        return this.chatService.startChat(user, dto);
    }

    // ─── O'z chatlarini olish ────────────────────────────────────────────────
    @Get('my')
    @ApiOperation({ summary: "O'z chatlarim — USER: o'z chatlari, MASTER: unga kelgan chatlar" })
    getMyChats(@UserData() user: JwtPayload, @Query() query: ChatQueryDto) {
        if (user.role === 'MASTER') return this.chatService.getMasterChats(user, query);
        return this.chatService.getUserChats(user, query);
    }

    // ─── Xabarlar tarixi ─────────────────────────────────────────────────────
    @Get(':id/messages')
    @ApiOperation({ summary: "Chat xabarlari (oxirgidan birinchiga — sahifalangan)" })
    getMessages(
        @Param('id', ParseIntPipe) id: number,
        @UserData() user: JwtPayload,
        @Query() query: ChatQueryDto,
    ) {
        return this.chatService.getMessages(id, user, query);
    }

    // ─── Fayl yuborish (REST) — keyin WS ga ham emit qiladi ──────────────────
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
    @ApiOperation({
        summary: `Fayl yoki matn xabar yuborish (REST) — rasm/video/hujjat/matn, max ${MAX_FILE_MB}MB`,
        description:
            'Yuborilgandan keyin ikkinchi tomonga: (1) WS orqali `chat` xonasida bo\'lsa darhol, ' +
            '(2) shu bilan bir qatorda `Notification` yozuvi ham yaratiladi (in-app ro\'yxat + agar ilova yopiq bo\'lsa FCM push) — ' +
            'ya\'ni foydalanuvchi chatni ochmagan bo\'lsa ham xabardor bo\'ladi.',
    })
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
            const isImage = file.mimetype.startsWith('image/');
            const filename = isImage ? `${Date.now()}.webp` : `${Date.now()}${extname(file.originalname)}`;
            const buffer = isImage ? await toOptimizedWebp(file.buffer) : file.buffer;
            await writeFile(join(dir, filename), buffer);
            fileUrl = `${subDir}/${filename}`;
            fileType = detectFileType(file.mimetype);
        }

        const message = await this.chatService.sendMessage(id, user, dto.content, fileUrl, fileType);

        // WS orqali real-time xabardorlik
        this.chatGateway.emitToChat(id, message);

        return message;
    }
}
