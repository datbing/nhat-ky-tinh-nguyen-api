import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import { UpdatePasswordDto } from '../dto'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  // ============================================================
  //  Get current user
  // ============================================================
  async getProfile(studentId: string) {
    return this.prisma.user.findUnique({
      where: { studentId },
      select: {
        studentId: true,
        fullName: true,
        email: true,
        unionGroup: true,
        position: true,
        avatarUrl: true,
        points: true,
      },
    })
  }

  // ============================================================
  //  Update avatar
  // ============================================================
  async updateAvatar(studentId: string, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { studentId },
      data: { avatarUrl },
    })
    return { message: 'Avatar updated successfully', user }
  }

  // ============================================================
  //  Change password
  // ============================================================
  async changePassword(studentId: string, dto: UpdatePasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { studentId } })
    if (!user) return { status: 0, message: 'Không tìm thấy người dùng' }

    const valid = await bcrypt.compare(dto.oldPassword, user.password)
    if (!valid) return { status: 0, message: 'Mật khẩu cũ không đúng' }

    const hashed = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({
      where: { studentId },
      data: { password: hashed },
    })
    return { status: 1, message: 'Đổi mật khẩu thành công' }
  }

  // ============================================================
  //  Notifications
  // ============================================================
  async getNotifications(studentId: string, unionGroup?: string) {
    return this.prisma.notifications.findMany({
      where: {
        OR: [
          { studentId },
          { unionGroup },
          { type: 'GLOBAL' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ============================================================
  //  Missions (check submitted)
  // ============================================================
  async getMissionsStatus(studentId: string) {
    const missions = await this.prisma.missions.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        missionName: true,
        createdAt: true,
        status: true, // open | closed
      }
    })
    const submissions = await this.prisma.missionSubmission.findMany({
      where: { studentId },
      select: { missionId: true },
    })
    const submittedIds = new Set(submissions.map(s => s.missionId))
    return missions.map(m => ({
      id: m.id,
      title: m.missionName,
      status: m.status,
      isSubmitted: submittedIds.has(m.id), // boolean
      statusText: submittedIds.has(m.id)
        ? "Đã tham gia"
        : m.status === "open"
          ? "Đang mở"
          : "Đã đóng",
    }))
  }

  // ============================================================
  //  Upload mission submission
  // ============================================================
  async uploadMission(data: {
    studentId: string;
    missionId: number;
    imageLink: string;
    note: string;
  }) {
    return this.prisma.missionSubmission.create({
      data: {
        studentId: data.studentId,
        missionId: data.missionId,
        imageLink: data.imageLink,
        note: data.note,
        status: "pending",
      },
    });
  }
}
