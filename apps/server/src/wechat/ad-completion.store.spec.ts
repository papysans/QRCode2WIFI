import { AdCompletionStore } from './ad-completion.store';

/**
 * 测试用子类：暴露对 protected now / ttlMs 的覆写能力。
 * 生产 DI 不依赖这些（构造函数无参），测试种子由此注入。
 */
class TestAdCompletionStore extends AdCompletionStore {
  constructor(deps: { now?: () => number; ttlMs?: number } = {}) {
    super();
    if (deps.now) this.now = deps.now;
    if (deps.ttlMs !== undefined) this.ttlMs = deps.ttlMs;
  }
}

describe('AdCompletionStore', () => {
  it('标记完成后可被消费一次', () => {
    let now = 0;
    const store = new TestAdCompletionStore({ now: () => now, ttlMs: 1000 });
    store.markCompleted('t1');
    expect(store.has('t1')).toBe(true);
    expect(store.consume('t1')).toBe(true);
  });

  it('防重放：同一 trans_id 不能被消费两次', () => {
    const store = new TestAdCompletionStore({ now: () => 0, ttlMs: 1000 });
    store.markCompleted('t1');
    expect(store.consume('t1')).toBe(true);
    expect(store.consume('t1')).toBe(false);
    expect(store.has('t1')).toBe(false);
  });

  it('未记录的 trans_id 消费返回 false', () => {
    const store = new TestAdCompletionStore({ now: () => 0, ttlMs: 1000 });
    expect(store.consume('unknown')).toBe(false);
    expect(store.has('unknown')).toBe(false);
  });

  it('过期记录不可消费', () => {
    let now = 0;
    const store = new TestAdCompletionStore({ now: () => now, ttlMs: 1000 });
    store.markCompleted('t1');
    now = 1001; // 超过 TTL
    expect(store.has('t1')).toBe(false);
    expect(store.consume('t1')).toBe(false);
  });

  it('重复回调（未消费）幂等刷新过期时间，不报错', () => {
    let now = 0;
    const store = new TestAdCompletionStore({ now: () => now, ttlMs: 1000 });
    store.markCompleted('t1');
    now = 500;
    store.markCompleted('t1'); // 刷新到期到 1500
    now = 1200; // 若未刷新则已过期
    expect(store.has('t1')).toBe(true);
    expect(store.consume('t1')).toBe(true);
  });

  it('已消费的记录不会被重复回调复活', () => {
    const store = new TestAdCompletionStore({ now: () => 0, ttlMs: 1000 });
    store.markCompleted('t1');
    expect(store.consume('t1')).toBe(true);
    store.markCompleted('t1'); // 已消费，应被忽略
    expect(store.has('t1')).toBe(false);
    expect(store.consume('t1')).toBe(false);
  });
});
