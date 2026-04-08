import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { MissionModule } from './mission/mission.module';
import { MainModule } from './main/main.module';
import { NewsModule } from './news/news.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [AuthModule, UserModule, MissionModule, MainModule, NewsModule, AdminModule],
})
export class AppModule { }
