import { Global, Module } from '@nestjs/common';
import {
  AD_PROVIDER,
  QRCODE_PROVIDER,
  WIFI_CONNECTOR,
} from './adapter.interfaces';
import {
  MockAdProvider,
  MockQrCodeProvider,
  MockWifiConnector,
} from './mock.adapters';
import {
  WechatAdProvider,
  WechatQrCodeProvider,
  WechatWifiConnector,
} from './wechat.adapters';

const useWechat = () => process.env.ADAPTER_MODE === 'wechat';

@Global()
@Module({
  providers: [
    {
      provide: AD_PROVIDER,
      useClass: useWechat() ? WechatAdProvider : MockAdProvider,
    },
    {
      provide: WIFI_CONNECTOR,
      useClass: useWechat() ? WechatWifiConnector : MockWifiConnector,
    },
    {
      provide: QRCODE_PROVIDER,
      useClass: useWechat() ? WechatQrCodeProvider : MockQrCodeProvider,
    },
  ],
  exports: [AD_PROVIDER, WIFI_CONNECTOR, QRCODE_PROVIDER],
})
export class AdaptersModule {}
