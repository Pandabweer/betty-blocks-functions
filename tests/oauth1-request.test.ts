import oath1Request from "../src/oauth1-request/1.0";
import CryptoJS from "../src/utils/crypto/hmac-sha1.min.js";

global.fetch = jest.fn();

describe("oath1Request", () => {
  const fetchMock = fetch as jest.MockedFunction<typeof fetch>;
  const originalRandom = CryptoJS.lib.WordArray.random;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    (CryptoJS.lib.WordArray as { random: (length: number) => { toString: () => string } }).random =
      jest.fn(() => ({ toString: () => "nonce123" }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (CryptoJS.lib.WordArray as { random: unknown }).random = originalRandom;
  });

  it("signs and performs a GET request, parsing JSON and header entries", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => '{"ok":true}',
      headers: {
        entries: () => [["x-trace", "abc-123"]],
      },
    } as unknown as Response);

    const result = await oath1Request({
      url: "https://example.com/resource?foo=bar&bad=%E0%A4%A#ignored-fragment",
      method: "GET",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      queryParams: [
        { key: "search", value: "hello world" },
        { key: "", value: "skip" },
      ],
      headers: [
        { key: "X-Test", value: 123 },
        { key: "X-Skip", value: undefined },
      ],
    });

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(requestUrl).toContain("https://example.com/resource?");
    expect(requestUrl).toContain("foo=bar");
    expect(requestUrl).toContain("bad=%25E0%25A4%25A");
    expect(requestUrl).toContain("search=hello%20world");
    expect(requestUrl).toContain("oauth_consumer_key=consumer-key");
    expect(requestUrl).toContain("oauth_nonce=nonce123");
    expect(requestUrl).toContain("oauth_signature=");

    expect(requestOptions.method).toBe("GET");
    expect(requestOptions.headers).toEqual({ "X-Test": "123" });
    expect(requestOptions.body).toBeUndefined();

    expect(result).toEqual({
      response: { ok: true },
      status: 200,
      headersOut: { "x-trace": "abc-123" },
    });
  });

  it("sends form body for POST and falls back to text when response is not JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      statusText: "Created",
      text: async () => "plain-text-response",
      headers: {
        server: "mock-server",
      },
    } as unknown as Response);

    const result = await oath1Request({
      url: "https://example.com/forms",
      method: "POST",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      token: "token-1",
      tokenSecret: "token-secret",
      bodyParams: [
        { key: "a", value: 1 },
        { key: "b", value: "two words" },
        { key: "ignored", value: undefined },
      ],
      sendAsForm: true,
    });

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(requestUrl).toContain("oauth_token=token-1");
    expect(requestOptions.method).toBe("POST");
    expect(requestOptions.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(requestOptions.body).toBe("a=1&b=two%20words");

    expect(result).toEqual({
      response: "plain-text-response",
      status: 201,
      headersOut: { server: "mock-server" },
    });
  });

  it("uses raw body without overriding an existing Content-Type", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{}",
      headers: { entries: () => [] },
    } as unknown as Response);

    await oath1Request({
      url: "https://example.com/patch",
      method: "PATCH",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      rawBody: '{"hello":"world"}',
      headers: [{ key: "Content-Type", value: "text/plain" }],
    });

    const [, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestOptions.headers).toEqual({ "Content-Type": "text/plain" });
    expect(requestOptions.body).toBe('{"hello":"world"}');
  });

  it("defaults raw body Content-Type to application/json when not provided", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{}",
      headers: { entries: () => [] },
    } as unknown as Response);

    await oath1Request({
      url: "https://example.com/post-raw-default-header",
      method: "POST",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      rawBody: '{"a":1}',
    });

    const [, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestOptions.headers).toEqual({ "Content-Type": "application/json" });
    expect(requestOptions.body).toBe('{"a":1}');
  });

  it("sends JSON body when body params are present and sendAsForm is false", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{}",
      headers: { entries: () => [] },
    } as unknown as Response);

    await oath1Request({
      url: "https://example.com/post-json",
      method: "POST",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
      bodyParams: [
        { key: "x", value: 1 },
        { key: "y", value: "z" },
      ],
      sendAsForm: false,
    });

    const [, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestOptions.headers).toEqual({ "Content-Type": "application/json" });
    expect(requestOptions.body).toBe('{"x":"1","y":"z"}');
  });

  it("throws with statusText fallback when response body is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "",
      headers: {},
    } as unknown as Response);

    await expect(
      oath1Request({
        url: "https://example.com/fail",
        method: "GET",
        consumerKey: "consumer-key",
        consumerSecret: "consumer-secret",
      }),
    ).rejects.toThrow("Request failed (401): Unauthorized");
  });

  it("falls back to Math.random nonce generation when CryptoJS random is unavailable", async () => {
    (CryptoJS.lib.WordArray as { random?: unknown }).random = undefined;
    jest.spyOn(Math, "random").mockReturnValue(0.123456789);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{}",
      headers: { entries: () => [] },
    } as unknown as Response);

    await oath1Request({
      url: "https://example.com/nonce-fallback",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
    });

    const expectedNonce = Math.random().toString(36).slice(2);
    const [requestUrl] = fetchMock.mock.calls[0] as [string];
    expect(requestUrl).toContain(`oauth_nonce=${expectedNonce}`);
  });

  it("handles empty query pairs, missing query keys, and missing response headers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "{}",
    } as unknown as Response);

    const result = await oath1Request({
      url: "https://example.com/q?&&=missingkey&ok=value",
      consumerKey: "consumer-key",
      consumerSecret: "consumer-secret",
    });

    const [requestUrl] = fetchMock.mock.calls[0] as [string];
    expect(requestUrl).toContain("ok=value");
    expect(requestUrl).not.toContain("missingkey");
    expect(result.headersOut).toEqual({});
  });
});
