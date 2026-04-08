import {
  Controller, Post, Body, Put, Param, Delete,
  UseInterceptors, UploadedFile, Patch, BadRequestException, ParseIntPipe, UseGuards,
  Get,
  DefaultValuePipe,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { Multer } from 'multer';
import { JwtAuthGuard } from '../auth/jwt.guard'

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post('members/demo')
  createDemoAccount(@Body() body: any) {
    return this.adminService.createDemoAccount(body);
  }

  @Put('members/:id')
  updateMember(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateMember(id, body);
  }

  @Delete('members/:id')
  deleteMember(@Param('id') id: string) {
    return this.adminService.deleteMember(id);
  }

  @Patch('members/:id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.adminService.resetPassword(id);
  }

  @Post('members/import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Không có file upload!');
    return this.adminService.importUserExcel(file);
  }

  @Delete('members')
  deleteAllMembers(@Body('confirm') confirm: string) {
    if (confirm !== 'yes') throw new BadRequestException('Hành động không được xác nhận!');
    return this.adminService.deleteAllMembers();
  }

  @Patch('members/reset-points')
  resetPoints() {
    return this.adminService.resetPoints();
  }

  @Put('missions/:id')
  editMission(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.adminService.editMission(id, body);
  }

  @Patch('missions/:id/reset')
  resetMission(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetMission(id);
  }

  @Patch('submissions/:id/approve-normal')
  approveSubmissionNormal(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveSubmissionNormal(id);
  }

  @Patch('submissions/:id/approve-news')
  approveSubmissionNews(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveSubmissionNews(id);
  }

  @Delete('submissions/:id')
  deleteSubmission(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteSubmission(id);
  }

  @Delete('news/:id')
  deleteNews(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteNews(id);
  }

  @Delete('news')
  deleteAllNews() {
    return this.adminService.deleteAllNews();
  }

  @Post('main-news')
  addMainNews(@Body() body: any) {
    return this.adminService.addMainNews(body);
  }

  @Put('main-news/:id')
  editMainNews(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.adminService.editMainNews(id, body);
  }

  @Delete('main-news/:id')
  deleteMainNews(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteMainNews(id);
  }

  @Post('digimap')
  addDigi(@Body() body: any) {
    return this.adminService.addDigi(body);
  }

  @Put('digimap/:id')
  editDigi(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.adminService.editDigi(id, body);
  }

  @Patch('digimap/:id/reset')
  resetDigi(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetDigi(id);
  }

  @Delete('digimap/:id')
  deleteDigi(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteDigi(id);
  }

  // Stats
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardData();
  }

  @Get('members')
  getMembers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('search') search: string
  ) {
    return this.adminService.getMembersPage(page, 10, search || '');
  }

  @Get('missions')
  getMissions() {
    return this.adminService.getMissionsData();
  }

  @Get('news')
  getNews(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.adminService.getNewsPage(page, 10);
  }

  @Get('rankings')
  getRankings() {
    return this.adminService.getRankingsData();
  }

  @Get('digimap')
  getDigimap() {
    return this.adminService.getDigimapData();
  }

  // Export
  @Get('export-data')
  getExportData(
    @Query('type') type: string,
    @Query('missionId') missionId: string
  ) {
    return this.adminService.getFullExportData(type, missionId ? parseInt(missionId) : undefined);
  }
}