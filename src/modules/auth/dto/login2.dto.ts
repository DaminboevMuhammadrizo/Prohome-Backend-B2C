import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, Length } from "class-validator";

export class Login2Dto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;
}
