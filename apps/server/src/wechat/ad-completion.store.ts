import { Injectable } from '@nestjs/common';

/**
 * 激励视频「已完成」记录存储（防伪核心）。
 *
 * 客户端自报的 isEnded / adToken 都是可伪造的，不能作为解锁依据。真正的完成事件
 * 由微信服务端回调（ad-callback.controller）写入本存储，verifyAdToken 再来查询。
 *
 * 本实现为进程内内存 Map（单实例足够，验证使用量阶段无需 Redis）。多实例部署应改为
 * Redis（带 TTL），此处用 TODO 标出。记录带过期时间，并在消费后标记防重放。
 */

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 分钟内有效

interface CompletionEntry {
  expiresAt: number;
  consumed: boolean;
}

@Injectable()
export class AdCompletionStore {
  /**
   * 时钟与 TTL 种子点：默认全局 Date.now / 10 分钟。
   * 不通过构造函数注入（否则 Nest DI 会试图解析 Object 类型参数而启动失败）；
   * 单测中 `new AdCompletionStore()` 后覆写这两个 protected 属性即可。
   */
  protected now: () => number = () => Date.now();
  protected ttlMs: number = DEFAULT_TTL_MS;
  private readonly store = new Map<string, CompletionEntry>();

  /** 微信回调验签通过后，记录该 trans_id 为已完成（幂等：重复回调不报错） */
  markCompleted(transId: string): void {
    this.sweep();
    const existing = this.store.get(transId);
    // 已消费的记录不复活；未消费的刷新过期时间即可
    if (existing && existing.consumed) {
      return;
    }
    this.store.set(transId, {
      expiresAt: this.now() + this.ttlMs,
      consumed: false,
    });
  }

  /**
   * 校验并消费 trans_id：存在、未过期、未消费 → 标记已消费并返回 true（防重放）。
   * 否则返回 false。
   */
  consume(transId: string): boolean {
    this.sweep();
    const entry = this.store.get(transId);
    if (!entry) return false;
    if (this.now() >= entry.expiresAt) {
      this.store.delete(transId);
      return false;
    }
    if (entry.consumed) return false;
    entry.consumed = true;
    return true;
  }

  /** 只读检查：是否存在有效且未消费的完成记录（不消费） */
  has(transId: string): boolean {
    this.sweep();
    const entry = this.store.get(transId);
    return !!entry && this.now() < entry.expiresAt && !entry.consumed;
  }

  /** 清理过期记录，避免内存无限增长 */
  private sweep(): void {
    const t = this.now();
    for (const [key, entry] of this.store) {
      if (t >= entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}
