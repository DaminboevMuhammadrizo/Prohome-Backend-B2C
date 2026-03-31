import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MasterModule } from './master/master.module';

@Module({
    controllers: [UserController],
    providers: [UserService],
    exports:[UserService],
    imports: [MasterModule],
})
export class UserModule { }
