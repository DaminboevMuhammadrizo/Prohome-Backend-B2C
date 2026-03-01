// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../database/prisma.service';

// @Injectable()
// export class ExportService {
//     constructor(private readonly prisma: PrismaService) { }

//     async getLastExportAt(): Promise<Date> {
//         const meta = await this.prisma.exportMeta.findUnique({
//             where: { key: 'google_sheets_export' },
//         });

//         return meta?.lastExportAt ?? new Date(0);
//     }

//     async updateLastExportAt(date: Date) {
//         await this.prisma.exportMeta.upsert({
//             where: { key: 'google_sheets_export' },
//             update: { lastExportAt: date },
//             create: {
//                 key: 'google_sheets_export',
//                 lastExportAt: date,
//             },
//         });
//     }

//     async getNewData(since: Date) {
//         const where = { createdAt: { gt: since } };

//         const [
//             users,
//             companies,
//             projects,
//             blocs,
//             doms,
//             floors,
//             padezs,
//             rooms,
//             roomDetails,
//             prices,
//             discountRooms,
//             payments,
//             subscriptions,
//             companySubscriptions,
//         ] = await Promise.all([
//             this.prisma.user.findMany({ where }),
//             this.prisma.company.findMany({ where }),
//             this.prisma.project.findMany({ where }),
//             this.prisma.bloc.findMany({ where }),
//             this.prisma.dom.findMany({ where }),
//             this.prisma.floor.findMany({ where }),
//             this.prisma.padez.findMany({ where }),
//             this.prisma.room.findMany({ where }),
//             this.prisma.roomDetails.findMany({ where }),
//             this.prisma.price.findMany({ where }),
//             this.prisma.discountRoom.findMany({ where }),
//             this.prisma.payment.findMany({ where }),
//             this.prisma.subscriptionPlan.findMany({ where }),
//             this.prisma.companySubscription.findMany({ where }),
//         ]);

//         return {
//             users,
//             companies,
//             projects,
//             blocs,
//             doms,
//             floors,
//             padezs,
//             rooms,
//             roomDetails,
//             prices,
//             discountRooms,
//             payments,
//             subscriptions,
//             companySubscriptions,
//         };
//     }
// }
