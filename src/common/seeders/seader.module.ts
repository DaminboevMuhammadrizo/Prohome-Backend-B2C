import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module";
import { SeederService } from "./seader.service";

@Module({
    imports: [PrismaModule],
    controllers: [],
    providers: [SeederService],
    exports:[SeederService],
})
export class SeaderModule { }
