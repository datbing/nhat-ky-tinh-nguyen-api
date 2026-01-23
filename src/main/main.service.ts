import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) { }

  async getMainPage() {
    const [news, latestSubmissions] = await Promise.all([
      this.prisma.main_news.findMany({
        orderBy: { id: 'desc' },
      }),
      this.prisma.news.findMany({
        orderBy: { id: 'desc' },
        take: 3,
      }),
    ]);

    return {
      news,
      latestSubmissions,
    };
  }

  async getDigiMap() {
    return this.prisma.digiMap.findMany({
      orderBy: { joined: 'desc' },
    });
  }

  async getRankings(topic: string) {
    if (topic === 'personal') {
      const rankings = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          avatarUrl: true,
          points: true,
          unionGroup: true,
        },
        orderBy: { points: 'desc' },
        take: 10,
      })

      return rankings.map((user, i) => ({
        rank: i + 1,
        studentId: user.studentId,
        fullName: user.fullName,
        unionGroup: user.unionGroup,
        avatarUrl: user.avatarUrl,
        points: user.points,
      }))
    }

    else if (topic === 'unionGroup') {
      const rankings = await this.prisma.user.groupBy({
        by: ['unionGroup'],
        _sum: { points: true },
        orderBy: {
          _sum: { points: 'desc' },
        },
        take: 10,
      })

      return rankings.map((r, i) => ({
        rank: i + 1,
        name: r.unionGroup,
        total_points: r._sum.points ?? 0,
      }))
    }

    else if (topic === "mission_1") {
      const rankings = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          avatarUrl: true,
        },
        orderBy: { points_1: 'desc' },
        take: 10,
      })

      return rankings.map((user, i) => ({
        rank: i + 1,
        studentId: user.studentId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }))
    }

    else if (topic === "mission_2") {
      const rankings = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          avatarUrl: true,
        },
        orderBy: { points_2: 'desc' },
        take: 10,
      })
      return rankings.map((user, i) => ({
        rank: i + 1,
        studentId: user.studentId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }))
    }

    else if (topic === "mission_3") {
      const rankings = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          avatarUrl: true,
        },
        orderBy: { points_3: 'desc' },
        take: 10,
      })
      return rankings.map((user, i) => ({
        rank: i + 1,
        studentId: user.studentId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }))
    }
    else if (topic === "mission_4") {
      const rankings = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          avatarUrl: true,
        },
        orderBy: { points_4: 'desc' },
        take: 10,
      })
      return rankings.map((user, i) => ({
        rank: i + 1,
        studentId: user.studentId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }))
    }

    else if (topic === "mission_5") {
      const rankings = await this.prisma.user.findMany({
        select: {
          studentId: true,
          fullName: true,
          avatarUrl: true,
        },
        orderBy: { points_5: 'desc' },
        take: 10,
      })
      return rankings.map((user, i) => ({
        rank: i + 1,
        studentId: user.studentId,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }))
    }
    return [];
  }
}
