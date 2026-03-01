// import { ConfigService } from "@nestjs/config";
// import { unlinkFile } from "../types/file.cotroller.typpes";
// import { urlGenerator } from "../types/generator.types";
// import { BadRequestException, NotFoundException } from "@nestjs/common";

// export enum EVeriification {
//     REGISTER = 'register',
//     RESET_PASSWORD = 'reset_password',
//     EDIT_PHONE = 'edit_phone',
// }
// export interface ICheckOtp {
//     type: EVeriification;
//     phone: string;
//     otp: string;
// }
// export function generateOtp(): string {
//     return String(Math.floor(10000 + Math.random() * 90000));
// }
// export interface SMSPayload {
//     mobile_phone: string;
//     message: string;
//     from: string;
//     callback_url: string;
// }
// export interface SMSSendResponse {
//     id: string;
//     status: string;
//     message: string;
// }


// export enum Language {
//     uz = 'uz',
//     en = 'en',
//     ru = 'ru',
// }



// export function generateUrlsFromFiles(
//     files: Express.Multer.File[] | undefined,
//     configService: ConfigService,
// ): string[] {
//     if (!files || !files.length) return [];

//     return files.map(file =>
//         urlGenerator(configService, file.filename),
//     );
// }

// export function replaceImages(
//     newFiles: Express.Multer.File[] | undefined,
//     oldUrls: string[],
//     configService: ConfigService,
// ): string[] {
//     if (!newFiles || newFiles.length === 0) {
//         return oldUrls;
//     }

//     if (oldUrls?.length) {
//         oldUrls.forEach(url => unlinkFile(url));
//     }

//     return newFiles.map(file =>
//         urlGenerator(configService, file.filename),
//     );
// }




// type ApartmentStatus = "SOLD" | "EMPTY";
// type ApartmentItem = {
//     room: number;
//     houseNumber: number;
//     size: number;
//     price: number;
//     status: ApartmentStatus;
//     view?: { "2d"?: string; "3d"?: string };
// };

// type ApartmentJson = {
//     data: {
//         maxFloor: number;
//         blockCount: number;
//         blocks: Record<
//             string,
//             {
//                 floor: number;
//                 appartment: ApartmentItem[][];
//             }
//         >;
//     };
// };

// const BASE_FLOOR_TEMPLATE = [
//     { room: 2, size: 50.4, price: 352.8 },
//     { room: 2, size: 50.4, price: 352.8 },
//     { room: 3, size: 60.4, price: 422.8 },
//     { room: 3, size: 60.4, price: 422.8 },
//     { room: 4, size: 76, price: 532 },
//     { room: 1, size: 35, price: 245 },
// ] as const;

// function makeBlock(floorCount: number, houseBase: number) {
//     const appartment: ApartmentItem[][] = [];

//     for (let floorIndex = 1; floorIndex <= floorCount; floorIndex++) {
//         // Har qavatda 6 ta xonadon
//         const floorItems: ApartmentItem[] = BASE_FLOOR_TEMPLATE.map((t, i) => {
//             const houseNumber = houseBase + floorIndex * 100 + (i + 1); // unik bo‘lishi uchun

//             // Status: oddiy pattern (xohlasangiz random ham qilamiz)
//             const status: ApartmentStatus =
//                 (floorIndex + i) % 3 === 0 ? "SOLD" : "EMPTY";

//             return {
//                 room: t.room,
//                 houseNumber,
//                 size: t.size,
//                 price: t.price,
//                 status,
//                 view: { "2d": "", "3d": "" },
//             };
//         });

//         appartment.push(floorItems);
//     }

//     return { floor: floorCount, appartment };
// }

// export const APARTMENT_DATA: ApartmentJson = {
//     data: {
//         maxFloor: 20,
//         blockCount: 2,
//         blocks: {
//             A: makeBlock(20, 0),     // A blok 20 qavat (houseNumber: 101,102... 2001...)
//             B: makeBlock(15, 5000),  // B blok 15 qavat (houseNumber: 5101,5102... 6501...)
//         },
//     },
// };


// export type Filter =
//     | "yesterday"
//     | "today"
//     | "last7"
//     | "last30"
//     | "custom";

// export function startOfDay(d: Date) {
//     const x = new Date(d);
//     x.setHours(0, 0, 0, 0);
//     return x;
// }
// export function endOfDay(d: Date) {
//     const x = new Date(d);
//     x.setHours(23, 59, 59, 999);
//     return x;
// }

// export function getRange(filter: Filter, from?: string, to?: string) {
//     const now = new Date();

//     if (filter === "today") {
//         return { from: startOfDay(now), to: endOfDay(now) };
//     }

//     if (filter === "yesterday") {
//         const y = new Date(now);
//         y.setDate(now.getDate() - 1);
//         return { from: startOfDay(y), to: endOfDay(y) };
//     }

//     if (filter === "last7") {
//         const f = new Date(now);
//         f.setDate(now.getDate() - 6);
//         return { from: startOfDay(f), to: endOfDay(now) };
//     }

//     if (filter === "last30") {
//         const f = new Date(now);
//         f.setDate(now.getDate() - 29);
//         return { from: startOfDay(f), to: endOfDay(now) };
//     }

//     if (!from || !to) throw new BadRequestException("from/to required for custom");

//     const f = new Date(from);
//     const t = new Date(to);

//     if (isNaN(f.getTime()) || isNaN(t.getTime())) {
//         throw new BadRequestException("Invalid from/to date");
//     }

//     return { from: startOfDay(f), to: endOfDay(t) };

// }

// export type SortBy = "sales" | "conversion" | "amount";
// export type Order = "asc" | "desc";


// const medals = ["🥇", "🥈", "🥉"];

// export function top3By<T>(rows: T[], key: keyof T) {
//     return [...rows]
//         .sort((a: any, b: any) => (b[key] ?? 0) - (a[key] ?? 0))
//         .slice(0, 3)
//         .map((item, i) => ({ ...item, badge: medals[i], rank: i + 1 }));
// }


// export const getStats = async( projectId, prisma, from: Date, to: Date) => {
//     const sales = await prisma.payment.aggregate({
//         where: {
//             status: "SUCCESS",
//             createdAt: { gte: from, lt: to },
//             room: { floor: { dom: { bloc: { projectId } } } },
//         },
//         _sum: { amount: true },
//         _count: { _all: true },
//     });

//     return {
//         totalSales: sales._count._all,
//         totalAmount: sales._sum.amount ?? 0,
//     };
// };

// export const percent = (cur: number, prev: number) =>
//     prev === 0 ? 0 : Number((((cur - prev) / prev) * 100).toFixed(2));


// export const sumPayments = async (projectId, prisma, from: Date, to: Date) => {
//     const agg = await prisma.payment.aggregate({
//         where: {
//             status: "SUCCESS",
//             createdAt: { gte: from, lt: to },
//             room: { floor: { dom: { bloc: { projectId } } } },
//         },
//         _sum: { amount: true },
//     });
//     return agg._sum.amount ?? 0;
// };




// export function parseLeadFromText(text: string) {
//   const email = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) ?? [])[0] ?? null;
//   const phone = (text.match(/(\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2})/i) ?? [])[0]?.replace(/\s+/g, '') ?? null;

//   // Name topish email’dan aniq bo‘lmasligi mumkin — keyin mapping qilamiz
//   // hozircha “First Last”ga o‘xshagan narsani olishga urinadi
//   const nameMatch = text.match(/Name[:\s]+([A-Za-zА-Яа-яʻ’`' -]{3,})/i);
//   const fullName = nameMatch?.[1]?.trim() ?? null;

//   let firstName = 'Unknown';
//   let lastName: string | null = null;

//   if (fullName) {
//     const parts = fullName.split(' ').filter(Boolean);
//     firstName = parts[0] ?? 'Unknown';
//     lastName = parts.slice(1).join(' ') || null;
//   }

//   return { email, phone, firstName, lastName };
// }