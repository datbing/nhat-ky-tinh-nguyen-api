import { Body, Controller, Post, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../dto';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private authService: AuthService) { }

  @Post('adminLogin')
  async adminLogin(@Body() body: any) {
    return this.authService.adminLogin(body);
  }
}
