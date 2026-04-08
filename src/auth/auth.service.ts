import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from '../dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) { }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { studentId: dto.studentId },
    });
    if (!user) return { status: 0, message: 'Không tìm thấy mã đoàn viên' };

    // const fixedHash = user.password.replace(/^\$2y\$/i, "$2b$");

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) return { status: 0, message: 'Mật khẩu không đúng' };


    const payload = { sub: user.studentId, unionGroup: user.unionGroup };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      status: 1,
      access_token,
      user: {
        id: user.studentId,
        email: user.email,
        fullName: user.fullName,
        unionGroup: user.unionGroup,
        position: user.position,
        avatarUrl: user.avatarUrl,
      },
    };
  }
  async adminLogin(body: any) {
    const payload = { sub: body.id, name: body.name, role: "admin" };
    const access_token = await this.jwtService.signAsync(payload);
    return { status: 1, access_token };
  }
}
