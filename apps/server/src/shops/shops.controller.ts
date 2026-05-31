import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import {
  LogoUploadResponse,
  QrCodeResponse,
  Shop,
  ShopStat,
} from '@q2w/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOpenid } from '../auth/current-user.decorator';
import { ShopsService } from './shops.service';
import { CreateShopDto, UpdateShopDto } from './dto';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

@Controller('shops')
@UseGuards(JwtAuthGuard)
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  @Get()
  list(@CurrentOpenid() openid: string): Promise<Shop[]> {
    return this.shops.listMine(openid);
  }

  @Post()
  create(
    @CurrentOpenid() openid: string,
    @Body() dto: CreateShopDto,
  ): Promise<Shop> {
    return this.shops.create(openid, dto);
  }

  @Get(':id')
  detail(
    @CurrentOpenid() openid: string,
    @Param('id') id: string,
  ): Promise<Shop> {
    return this.shops.getDetail(id, openid);
  }

  @Patch(':id')
  update(
    @CurrentOpenid() openid: string,
    @Param('id') id: string,
    @Body() dto: UpdateShopDto,
  ): Promise<Shop> {
    return this.shops.update(id, openid, dto);
  }

  @Get(':id/stats')
  stats(
    @CurrentOpenid() openid: string,
    @Param('id') id: string,
  ): Promise<ShopStat> {
    return this.shops.getStats(id, openid);
  }

  @Post(':id/qrcode')
  qrcode(
    @CurrentOpenid() openid: string,
    @Param('id') id: string,
  ): Promise<QrCodeResponse> {
    return this.shops.generateQrCode(id, openid);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), uploadDir),
        filename: (_req, file, cb) => {
          const name = `${randomBytes(8).toString('hex')}${extname(file.originalname)}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadLogo(
    @CurrentOpenid() openid: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<LogoUploadResponse> {
    const logoUrl = `/uploads/${file.filename}`;
    await this.shops.setLogo(id, openid, logoUrl);
    return { logoUrl };
  }
}
