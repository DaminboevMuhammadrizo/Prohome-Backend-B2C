import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsString, IsNotEmpty, Length, IsEmpty, IsEnum } from "class-validator";
import { Language, RegisterRole } from "src/common/utils/helper";

export class SendOtpDto {
    @ApiProperty({ example: '+998901234567' })
    @IsString()
    @IsNotEmpty()
    @Length(9, 13)
    phone: string;

    @ApiProperty({ enum: Language, example: Language.uz })
    @IsEnum(Language)
    @IsNotEmpty()
    lang: Language;
}




export class RegisterAuthDto {
    @ApiProperty({ example: '+998901234567' })
    @IsString()
    @IsNotEmpty()
    @Length(9, 13)
    phone: string;

    @ApiProperty({ enum: RegisterRole, example: RegisterRole.CLIENT })
    @IsEnum(RegisterRole)
    @IsNotEmpty()
    role: RegisterRole;

    @ApiProperty({ example: '123456' })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    otp: string;
}

export class TestSmsDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone: string;
}