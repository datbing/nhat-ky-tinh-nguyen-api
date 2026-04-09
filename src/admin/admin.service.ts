import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaPromise } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as xlsx from 'xlsx';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  // ==========================================
  // MEMBERS
  // ==========================================
  async createDemoAccount(data: any) {
    const { studentId, fullName, unionGroup, position = 'Đoàn viên' } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { studentId },
    });
    if (existingUser) throw new BadRequestException('Mã Đoàn viên này đã tồn tại!');

    const defaultPass = await bcrypt.hash('123456', 10);

    await this.prisma.user.create({
      data: {
        studentId,
        fullName,
        unionGroup,
        position,
        password: defaultPass,
      },
    });

    return { status: 'success', message: `Đã tạo tài khoản demo: ${fullName} (${studentId})` };
  }

  async updateMember(id: string, data: any) {
    const { fullName, unionGroup, position } = data;
    if (!id) throw new BadRequestException('Lỗi: Không tìm thấy ID thành viên!');
    if (!fullName) throw new BadRequestException('Vui lòng nhập họ tên!');

    await this.prisma.user.update({
      where: { studentId: id },
      data: { fullName, unionGroup, position },
    });

    return { status: 'success', message: 'Cập nhật thông tin thành công!' };
  }

  async deleteMember(id: string) {
    if (!id) throw new BadRequestException('Lỗi: Không tìm thấy ID thành viên!');

    await this.prisma.$transaction(async (tx) => {
      await tx.newsLike.deleteMany({ where: { userId: id } });
      await tx.newsComment.deleteMany({ where: { userId: id } });
      const userNews = await tx.news.findMany({
        where: { authorId: id },
        select: { id: true }
      });
      const newsIds = userNews.map(n => n.id);
      if (newsIds.length > 0) {
        await tx.newsLike.deleteMany({ where: { newsId: { in: newsIds } } });
        await tx.newsComment.deleteMany({ where: { newsId: { in: newsIds } } });
      }
      await tx.news.deleteMany({ where: { authorId: id } });
      await tx.missionSubmission.deleteMany({ where: { studentId: id } });
      await tx.user.delete({ where: { studentId: id } });

    });

    return { status: 'success', message: 'Đã xóa đoàn viên và toàn bộ dữ liệu liên quan!' };
  }

  async resetPassword(id: string) {
    if (!id) throw new BadRequestException('Thiếu studentId!');
    const newPass = await bcrypt.hash('123456', 10);

    await this.prisma.user.update({
      where: { studentId: id },
      data: { password: newPass },
    });

    return { status: 'success', message: 'Đã reset mật khẩu về 123456!' };
  }

  async importUserExcel(file: Express.Multer.File) {
    try {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[][];

      const defaultPassHash = await bcrypt.hash('123456', 10);
      let count = 0;

      const upsertPromises: PrismaPromise<any>[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0] || String(r[0]).trim() === '') continue;

        const studentId = String(r[0]).trim();
        const fullName = String(r[1] || '').trim();
        const unionGroup = String(r[2] || '').trim();
        let position = String(r[3] || '').trim();

        if (position === '') position = 'Đoàn viên';
        if (fullName === '') continue;

        upsertPromises.push(
          this.prisma.user.upsert({
            where: { studentId },
            update: { fullName, unionGroup, position },
            create: { studentId, fullName, unionGroup, position, password: defaultPassHash },
          })
        );
        count++;
      }

      await this.prisma.$transaction(upsertPromises);
      return { status: 'success', message: `Đã import ${count} đoàn viên!` };

    } catch (err) {
      throw new InternalServerErrorException(`Lỗi import: ${(err as Error).message}`);
    }
  }

  async deleteAllMembers() {
    await this.prisma.$transaction([
      this.prisma.newsLike.deleteMany(),        // Xóa like trước
      this.prisma.newsComment.deleteMany(),     // Xóa bình luận
      this.prisma.news.deleteMany(),            // Xóa bài viết
      this.prisma.missionSubmission.deleteMany(),// Xóa bài nộp nhiệm vụ
      this.prisma.user.deleteMany()             // Xóa User CUỐI CÙNG
    ]);

    return { status: 'success', message: 'Đã xóa hết tất cả đoàn viên và dữ liệu liên quan!' };
  }
  async resetPoints() {
    const missions = await this.prisma.missions.findMany({ select: { id: true } });

    const updateData: any = { points: 0 };
    missions.forEach(m => {
      updateData[`points_${m.id}`] = 0;
    });

    await this.prisma.user.updateMany({
      data: updateData,
    });

    return { status: 'success', message: 'Đã reset điểm cho tất cả đoàn viên!' };
  }

  // ==========================================
  // MISSIONS & APPROVAL
  // ==========================================
  async editMission(id: number, data: any) {
    const { missionName, for: missionFor, status } = data;

    await this.prisma.missions.update({
      where: { id },
      data: { missionName, for: missionFor, status },
    });

    return { status: 'success', message: 'Cập nhật nhiệm vụ thành công!' };
  }

  async resetMission(id: number) {
    await this.prisma.$transaction([
      this.prisma.missionSubmission.deleteMany({ where: { missionId: id } }),
      this.prisma.missions.update({
        where: { id },
        data: { joined: 0, status: 'close', missionName: '(Chưa đặt tên)' },
      })
    ]);

    return { status: 'success', message: 'Đã reset nhiệm vụ!' };
  }

  async approveSubmissionNormal(id: number) {
    const sub = await this.getSubmission(id);
    await this.processApproval(sub);
    return { status: 'success', message: 'Duyệt thành công! Đã cộng điểm nhiệm vụ.' };
  }

  async approveSubmissionNews(id: number) {
    const sub = await this.getSubmission(id);

    await this.prisma.$transaction(async (tx) => {
      await this.processApproval(sub, tx);

      const title = `Bài nộp nhiệm vụ #${sub.missionId}`;
      await tx.news.create({
        data: {
          authorId: sub.studentId,
          title,
          content: sub.note || '',
          imageUrl: sub.imageLink,
          submissionId: sub.id,
        }
      });
    });

    return { status: 'success', message: 'Đã duyệt + đăng News + cộng điểm!' };
  }

  async deleteSubmission(id: number) {
    await this.prisma.missionSubmission.delete({ where: { id } });
    return { status: 'success', message: 'Đã xóa submission!' };
  }

  private async getSubmission(id: number) {
    const sub = await this.prisma.missionSubmission.findUnique({ where: { id } });
    if (!sub) throw new BadRequestException('Submission không tồn tại!');
    return sub;
  }

  private async processApproval(sub: any, txClient: any = this.prisma) {
    const pointField = `points_${sub.missionId}`;

    await txClient.missionSubmission.update({
      where: { id: sub.id },
      data: { status: 'approved' },
    });

    await txClient.user.update({
      where: { studentId: sub.studentId },
      data: {
        points: { increment: 1 },
        [pointField]: { increment: 1 }
      },
    });

    await txClient.missions.update({
      where: { id: sub.missionId },
      data: { joined: { increment: 1 } },
    });
  }

  // ==========================================
  // NEWS & DIGIMAP & CHATBOT
  // ==========================================
  async deleteNews(id: number) {
    await this.prisma.$transaction([
      this.prisma.newsLike.deleteMany({ where: { newsId: id } }),
      this.prisma.newsComment.deleteMany({ where: { newsId: id } }),
      this.prisma.news.delete({ where: { id } })
    ]);
    return { status: 'success', message: 'Đã xoá bài viết thành công!' };
  }

  async deleteAllNews() {
    await this.prisma.$transaction([
      this.prisma.newsLike.deleteMany(),
      this.prisma.newsComment.deleteMany(),
      this.prisma.news.deleteMany()
    ]);
    return { status: 'success', message: 'Đã xóa hết tất cả tin tức!' };
  }

  async addMainNews(data: any) {
    await this.prisma.main_news.create({
      data: { link: data.link, image: data.image },
    });
    return { status: 'success', message: 'Đã thêm bài!' };
  }

  async editMainNews(id: number, data: any) {
    await this.prisma.main_news.update({
      where: { id },
      data: { link: data.link, image: data.image },
    });
    return { status: 'success', message: 'Đã cập nhật!' };
  }

  async deleteMainNews(id: number) {
    await this.prisma.main_news.delete({ where: { id } });
    return { status: 'success', message: 'Đã xóa!' };
  }

  async addDigi(data: any) {
    await this.prisma.digiMap.create({
      data: { pinName: data.pinName, pinLink: data.pinLink, joined: 0 },
    });
    return { status: 'success', message: 'Đã thêm điểm mới!' };
  }

  async editDigi(id: number, data: any) {
    await this.prisma.digiMap.update({
      where: { id },
      data: { pinName: data.pinName, pinLink: data.pinLink },
    });
    return { status: 'success', message: 'Đã lưu thay đổi!' };
  }

  async resetDigi(id: number) {
    await this.prisma.digiMap.update({
      where: { id },
      data: { joined: 0 },
    });
    return { status: 'success', message: 'Đã reset!' };
  }

  async deleteDigi(id: number) {
    await this.prisma.digiMap.delete({ where: { id } });
    return { status: 'success', message: 'Đã xóa điểm!' };
  }

  // ==========================================
  // VIEW GETTERS (DASHBOARD, RANKINGS, ETC)
  // ==========================================
  async getDashboardData() {
    // Sử dụng Prisma Native groupBy thay vì queryRaw
    const rawUnionStats = await this.prisma.user.groupBy({
      by: ['unionGroup'],
      _count: { _all: true },
      orderBy: { _count: { studentId: 'desc' } }
    });

    // Map lại để khớp key `total` cho PHP Frontend
    const unionStats = rawUnionStats.map(item => ({
      unionGroup: item.unionGroup,
      total: item._count._all
    }));

    const [totalMembers, pendingSubs, openMissions, totalNews, topMembers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.missionSubmission.count({ where: { status: 'pending' } }),
      this.prisma.missions.count({ where: { status: 'open' } }),
      this.prisma.news.count(),
      this.prisma.user.findMany({
        select: { studentId: true, fullName: true, points: true },
        orderBy: { points: 'desc' },
        take: 5
      })
    ]);

    return { totalMembers, pendingSubs, openMissions, totalNews, topMembers, unionStats };
  }

  async getMembersPage(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    const where = search ? {
      OR: [
        { studentId: { contains: search, mode: 'insensitive' as any } },
        { fullName: { contains: search, mode: 'insensitive' as any } }
      ]
    } : {};

    const [totalRows, members] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { studentId: 'asc' },
        skip,
        take: limit
      })
    ]);

    return {
      members,
      pagination: {
        totalRows,
        totalPages: Math.ceil(totalRows / limit),
        currentPage: page
      }
    };
  }

  async getNewsPage(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [totalRows, news] = await Promise.all([
      this.prisma.news.count(),
      this.prisma.news.findMany({
        include: { author: { select: { fullName: true } } },
        orderBy: { id: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      news,
      pagination: {
        totalRows,
        totalPages: Math.ceil(totalRows / limit),
        currentPage: page
      }
    };
  }

  async getMissionsData() {
    const [missions, pendingSubs] = await Promise.all([
      this.prisma.missions.findMany({ orderBy: { id: 'asc' }, take: 5 }),
      this.prisma.missionSubmission.findMany({
        where: { status: 'pending' },
        include: { user: { select: { fullName: true } } },
        orderBy: { id: 'asc' }
      })
    ]);
    return { missions, pendingSubs };
  }

  async getRankingsData() {
    const missions = await this.prisma.missions.findMany({
      orderBy: { id: 'asc' },
      take: 5
    });

    // 1. Prisma Native cho Ranking by Mission với Dynamic Object Keys
    const rankingByMission = await Promise.all(missions.map(async (m) => {
      const col = `points_${m.id}`;

      const rawList = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          unionGroup: true,
          [col]: true, // Khai báo chọn cột động
        },
        orderBy: {
          [col]: 'desc', // Sắp xếp theo cột động
        },
        take: 10
      });

      // Đổi key từ `points_x` thành `mission_points` cho PHP frontend hiểu
      const list = rawList.map(u => ({
        studentId: u.studentId,
        fullName: u.fullName,
        unionGroup: u.unionGroup,
        mission_points: (u as any)[col]
      }));

      return { mission: m, list };
    }));

    // 2. Rank cá nhân
    const rankPersonal = await this.prisma.user.findMany({
      select: { studentId: true, fullName: true, unionGroup: true, points: true },
      orderBy: { points: 'desc' },
      take: 10
    });

    // 3. Prisma Native cho Group By Union Group
    const rawRankUnion = await this.prisma.user.groupBy({
      by: ['unionGroup'],
      _sum: { points: true },
      _count: { _all: true },
      where: {
        unionGroup: {
          not: null, // IS NOT NULL
          notIn: ['']  // <> ''
        }
      },
      orderBy: {
        _sum: { points: 'desc' }
      },
      take: 10
    });

    // Đổi tên key khớp với JSON cũ: `total_points` và `member_count`
    const rankUnion = rawRankUnion.map(item => ({
      unionGroup: item.unionGroup,
      total_points: item._sum.points || 0,
      member_count: item._count._all
    }));

    return { rankingByMission, rankPersonal, rankUnion };
  }

  async getDigimapData() {
    const [digi, mainNews] = await Promise.all([
      this.prisma.digiMap.findMany({ orderBy: { id: 'desc' } }),
      this.prisma.main_news.findMany({ orderBy: { id: 'desc' } })
    ]);
    return { digi, mainNews };
  }

  //export
  // ==========================================
  // EXPORT EXCEL DATA
  // ==========================================
  async getFullExportData(type: string, missionId?: number) {
    if (type === 'union') {
      const rawRankUnion = await this.prisma.user.groupBy({
        by: ['unionGroup'],
        _sum: { points: true },
        _count: { _all: true },
        where: { unionGroup: { not: null, notIn: [''] } },
        orderBy: { _sum: { points: 'desc' } }
      });
      return rawRankUnion.map(item => ({
        unionGroup: item.unionGroup,
        total_points: item._sum.points || 0,
        member_count: item._count._all
      }));
    }

    if (type === 'personal') {
      return this.prisma.user.findMany({
        select: { studentId: true, fullName: true, unionGroup: true, points: true },
        orderBy: { points: 'desc' }
      });
    }

    if (type === 'mission' && missionId) {
      const col = `points_${missionId}`;
      const rawList = await this.prisma.user.findMany({
        select: { studentId: true, fullName: true, unionGroup: true, [col]: true },
        orderBy: { [col]: 'desc' }
      });

      // Map lại tên cột cho giống code PHP cũ
      return rawList.map(u => ({
        studentId: u.studentId,
        fullName: u.fullName,
        unionGroup: u.unionGroup,
        mission_point: (u as any)[col]
      }));
    }

    throw new BadRequestException('Loại hình export không hợp lệ!');
  }
}