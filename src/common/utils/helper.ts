import { ConfigService } from "@nestjs/config";
import { unlinkFile } from "../types/file.cotroller.typpes";
import { urlGenerator } from "../types/generator.types";
import { BadRequestException, NotFoundException } from "@nestjs/common";

export enum EVeriification {
    REGISTER = 'register',
    RESET_PASSWORD = 'reset_password',
    EDIT_PHONE = 'edit_phone',
}
export interface ICheckOtp {
    type: EVeriification;
    phone: string;
    otp: string;
}
export function generateOtp(): string {
    return String(Math.floor(10000 + Math.random() * 90000));
}
export interface SMSPayload {
    mobile_phone: string;
    message: string;
    from: string;
    callback_url: string;
}
export interface SMSSendResponse {
    id: string;
    status: string;
    message: string;
}


export enum Language {
    uz = 'uz',
    en = 'crl',
    ru = 'ru',
}


export enum RegisterRole {
  CLIENT = 'CLIENT',
  MASTER = 'MASTER',
}


export function generateUrlsFromFiles(
    files: Express.Multer.File[] | undefined,
    configService: ConfigService,
): string[] {
    if (!files || !files.length) return [];

    return files.map(file =>
        urlGenerator(configService, file.filename),
    );
}

export function replaceImages(
    newFiles: Express.Multer.File[] | undefined,
    oldUrls: string[],
    configService: ConfigService,
): string[] {
    if (!newFiles || newFiles.length === 0) {
        return oldUrls;
    }

    if (oldUrls?.length) {
        oldUrls.forEach(url => unlinkFile(url));
    }

    return newFiles.map(file =>
        urlGenerator(configService, file.filename),
    );
}


