// import { Injectable } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { PrismaService } from 'src/common/database/prisma.service';

// @Injectable()
// export class CleanupService {
//     constructor(private prisma: PrismaService) { }

//     @Cron('0 0 1 * *')
//     async cleanupOldLogs() {
//         const retentionDate = new Date();
//         retentionDate.setMonth(retentionDate.getMonth() - 1);

//         await this.prisma.requestLog.deleteMany({
//             where: { createdAt: { lt: retentionDate } },
//         });
//     }
// }
