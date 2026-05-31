import { WechatTokenService } from './wechat-token.service';

/** 构造一个返回指定 JSON 的假 Response */
function jsonResponse(body: unknown): Response {
  return {
    json: async () => body,
  } as unknown as Response;
}

/**
 * 测试用子类：暴露对 protected fetchFn / now 的覆写能力。
 * 生产 DI 不依赖这些（构造函数无参），测试种子由此注入。
 */
class TestWechatTokenService extends WechatTokenService {
  constructor(deps: { fetchFn?: typeof fetch; now?: () => number } = {}) {
    super();
    if (deps.fetchFn) this.fetchFn = deps.fetchFn;
    if (deps.now) this.now = deps.now;
  }
}

describe('WechatTokenService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, WX_APPID: 'wxtest', WX_SECRET: 'secret' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('首次获取会请求 stable_token 并缓存', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ access_token: 'tok-1', expires_in: 7200 }));
    let now = 1_000_000;
    const svc = new TestWechatTokenService({ fetchFn, now: () => now });

    const t = await svc.getAccessToken();
    expect(t).toBe('tok-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // 未过期时复用缓存，不再请求
    now += 1000;
    const t2 = await svc.getAccessToken();
    expect(t2).toBe('tok-1');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('过期（含提前 5 分钟刷新窗口）后重新获取', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-1', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-2', expires_in: 7200 }));
    let now = 0;
    const svc = new TestWechatTokenService({ fetchFn, now: () => now });

    expect(await svc.getAccessToken()).toBe('tok-1');

    // expiresAt = 0 + 7200_000 - 300_000 = 6_900_000；推进到该点之后触发刷新
    now = 6_900_001;
    expect(await svc.getAccessToken()).toBe('tok-2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('并发请求只触发一次刷新（去重）', async () => {
    let resolveFetch!: (r: Response) => void;
    const fetchFn = jest.fn().mockReturnValue(
      new Promise<Response>((r) => {
        resolveFetch = r;
      }),
    );
    const svc = new TestWechatTokenService({ fetchFn, now: () => 0 });

    const p1 = svc.getAccessToken();
    const p2 = svc.getAccessToken();
    resolveFetch(jsonResponse({ access_token: 'tok-x', expires_in: 7200 }));

    expect(await p1).toBe('tok-x');
    expect(await p2).toBe('tok-x');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('invalidate 后下次重新获取', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-1', expires_in: 7200 }))
      .mockResolvedValueOnce(jsonResponse({ access_token: 'tok-2', expires_in: 7200 }));
    const svc = new TestWechatTokenService({ fetchFn, now: () => 0 });

    expect(await svc.getAccessToken()).toBe('tok-1');
    svc.invalidate();
    expect(await svc.getAccessToken()).toBe('tok-2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('微信返回错误体时抛错', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ errcode: 40013, errmsg: 'invalid appid' }));
    const svc = new TestWechatTokenService({ fetchFn, now: () => 0 });
    await expect(svc.getAccessToken()).rejects.toThrow(/40013/);
  });

  it('缺少 appid/secret 时抛错', async () => {
    delete process.env.WX_APPID;
    const fetchFn = jest.fn();
    const svc = new TestWechatTokenService({ fetchFn, now: () => 0 });
    await expect(svc.getAccessToken()).rejects.toThrow(/WX_APPID/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
