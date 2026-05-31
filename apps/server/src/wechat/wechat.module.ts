import { Global, Module } from '@nestjs/common';
import { WechatTokenService } from './wechat-token.service';
import { AdCompletionStore } from './ad-completion.store';
import { AdCallbackController } from './ad-callback.controller';

/**
 * 微信相关基础设施模块：access_token 缓存、激励视频完成记录存储、回调接收端。
 *
 * 设为 Global，使 adapters（WechatQrCodeProvider / WechatAdProvider）可直接注入
 * WechatTokenService 与 AdCompletionStore。回调控制器始终挂载（mock 模式下也无害——
 * 仅当微信真实调用且验签通过才写入记录）。
 */
@Global()
@Module({
  controllers: [AdCallbackController],
  providers: [WechatTokenService, AdCompletionStore],
  exports: [WechatTokenService, AdCompletionStore],
})
export class WechatModule {}
