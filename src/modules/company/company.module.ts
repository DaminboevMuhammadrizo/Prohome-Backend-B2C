import { Module } from '@nestjs/common';
import { B2bModule } from '../b2b/b2b.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [B2bModule],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
