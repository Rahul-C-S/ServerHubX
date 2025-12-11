import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileManagerService, FileInfo, FileContent } from './file-manager.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import {
  ListDirectoryDto,
  ReadFileDto,
  WriteFileDto,
  CreateFileDto,
  CreateDirectoryDto,
  DeleteFileDto,
  DeleteDirectoryDto,
  MoveFileDto,
  CopyFileDto,
  ExtractArchiveDto,
  SetPermissionsDto,
  SetOwnershipDto,
  UploadFileDto,
  DownloadFileDto,
} from './dto/file-manager.dto.js';

@Controller('files')
export class FileManagerController {
  constructor(private readonly fileManagerService: FileManagerService) {}

  @Get()
  async listDirectory(
    @CurrentUser() user: User,
    @Query() dto: ListDirectoryDto,
  ): Promise<{ files: FileInfo[]; path: string }> {
    const files = await this.fileManagerService.listDirectory(
      user,
      dto.path || '.',
      dto.targetUsername,
      dto.showHidden,
    );
    return { files, path: dto.path || '.' };
  }

  @Get('content')
  async readFile(
    @CurrentUser() user: User,
    @Query() dto: ReadFileDto,
  ): Promise<FileContent> {
    return this.fileManagerService.readFile(user, dto.path, dto.targetUsername);
  }

  @Put('content')
  async writeFile(
    @CurrentUser() user: User,
    @Body() dto: WriteFileDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.writeFile(
      user,
      dto.path,
      dto.content,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Post('create')
  async createFile(
    @CurrentUser() user: User,
    @Body() dto: CreateFileDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.createFile(
      user,
      dto.path,
      dto.content,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Post('directory')
  async createDirectory(
    @CurrentUser() user: User,
    @Body() dto: CreateDirectoryDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.createDirectory(
      user,
      dto.path,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Delete()
  async deleteFile(
    @CurrentUser() user: User,
    @Query() dto: DeleteFileDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.deleteFile(user, dto.path, dto.targetUsername);
    return { success: true };
  }

  @Delete('directory')
  async deleteDirectory(
    @CurrentUser() user: User,
    @Query() dto: DeleteDirectoryDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.deleteDirectory(
      user,
      dto.path,
      dto.recursive,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Post('move')
  async moveFile(
    @CurrentUser() user: User,
    @Body() dto: MoveFileDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.moveFile(
      user,
      dto.sourcePath,
      dto.destPath,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Post('copy')
  async copyFile(
    @CurrentUser() user: User,
    @Body() dto: CopyFileDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.copyFile(
      user,
      dto.sourcePath,
      dto.destPath,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Post('extract')
  async extractArchive(
    @CurrentUser() user: User,
    @Body() dto: ExtractArchiveDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.extractArchive(
      user,
      dto.archivePath,
      dto.destPath,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Get('permissions')
  async getPermissions(
    @CurrentUser() user: User,
    @Query('path') filePath: string,
    @Query('targetUsername') targetUsername?: string,
  ): Promise<{ permissions: string; owner: string; group: string }> {
    return this.fileManagerService.getPermissions(user, filePath, targetUsername);
  }

  @Patch('permissions')
  async setPermissions(
    @CurrentUser() user: User,
    @Body() dto: SetPermissionsDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.setPermissions(
      user,
      dto.path,
      dto.permissions,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Patch('ownership')
  async setOwnership(
    @CurrentUser() user: User,
    @Body() dto: SetOwnershipDto,
  ): Promise<{ success: boolean }> {
    await this.fileManagerService.setOwnership(
      user,
      dto.path,
      dto.owner,
      dto.group,
      dto.targetUsername,
    );
    return { success: true };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<{ success: boolean; filename: string }> {
    await this.fileManagerService.uploadFile(
      user,
      dto.path || '.',
      file.buffer,
      file.originalname,
      dto.targetUsername,
    );
    return { success: true, filename: file.originalname };
  }

  @Get('download')
  async downloadFile(
    @CurrentUser() user: User,
    @Query() dto: DownloadFileDto,
    @Res() res: Response,
  ): Promise<void> {
    const fullPath = await this.fileManagerService.getDownloadPath(
      user,
      dto.path,
      dto.targetUsername,
    );

    const filename = path.basename(fullPath);
    const fileBuffer = await fs.readFile(fullPath);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileBuffer);
  }

  @Get('access')
  async getAccessInfo(
    @CurrentUser() user: User,
    @Query('targetUsername') targetUsername?: string,
  ): Promise<{ basePath: string; canAccess: boolean; reason?: string; username: string }> {
    return this.fileManagerService.getAccessInfo(user, targetUsername);
  }
}
