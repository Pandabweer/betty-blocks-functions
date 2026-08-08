import jwtDecode from "../../src/utils/auth";

describe("jwtDecode", () => {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: "1234567890", name: "John Doe", admin: true };

  const base64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const base64urlFromString = (value: string) =>
    Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const token = `${base64url(header)}.${base64url(payload)}.signature`;

  it("should decode payload by default", () => {
    expect(jwtDecode(token)).toEqual(payload);
  });

  it("should decode header when header option is true", () => {
    expect(jwtDecode(token, { header: true })).toEqual(header);
  });

  it("should throw error on non-string token", () => {
    // @ts-expect-error Testing non-string input
    expect(() => jwtDecode(null)).toThrow("Invalid token specified");
  });

  it("should throw error on invalid JSON", () => {
    const badToken = "bad.header.segment";
    expect(() => jwtDecode(badToken)).toThrow("Invalid token specified: Unexpected token");
  });

  it("should throw error when token has less than 2 parts", () => {
    expect(() => jwtDecode("onlyonepart")).toThrow(
      "Invalid token specified: Cannot read properties of undefined",
    );
  });

  it("should throw when payload is invalid JSON", () => {
    const header = Buffer.from(JSON.stringify({ typ: "JWT" })).toString("base64url");
    const invalidPayload = Buffer.from("{invalidJson:").toString("base64url");
    const token = `${header}.${invalidPayload}.signature`;

    expect(() => jwtDecode(token)).toThrow(/^Invalid token specified:/);
  });

  it("should throw when token has no payload or header", () => {
    const badToken = "....";
    expect(() => jwtDecode(badToken)).toThrow(/Invalid token specified:/);
  });

  it("should throw error if payload base64 string is of invalid length", () => {
    const badBase64 = "abcde";
    const token = `header.${badBase64}.signature`;
    expect(() => jwtDecode(token)).toThrow("Invalid token specified:");
  });

  it("should fallback to polyfill if decodeURIComponent fails", () => {
    const badPayload = Buffer.from("%%%")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const token = `header.${badPayload}.signature`;
    expect(() => jwtDecode(token)).toThrow("Invalid token specified:");
  });

  it("decodes payloads that require single-character padding", () => {
    const paddingSensitivePayload = { data: "xxx" }; // len 3 ensures base64 len % 4 === 3.
    const payloadSegment = base64url(paddingSensitivePayload);
    expect(payloadSegment.length % 4).toBe(3);

    const paddedToken = `${base64url(header)}.${payloadSegment}.signature`;

    expect(jwtDecode(paddedToken)).toEqual(paddingSensitivePayload);
  });

  it("decodes payloads containing low ASCII characters", () => {
    const controlPayload = { ctrl: "\u0005" };
    const controlToken = `${base64url(header)}.${base64url(controlPayload)}.signature`;

    expect(jwtDecode(controlToken)).toEqual(controlPayload);
  });

  it("throws when payload base64 padding is invalid", () => {
    const headerSegment = base64url(header);
    const invalidPayloadSegment = "abcde==="; // multiple-of-4 length with 3 trailing '='.
    const malformedToken = `${headerSegment}.${invalidPayloadSegment}.signature`;

    expect(() => jwtDecode(malformedToken)).toThrow(
      "Invalid token specified: failed: The string to be decoded is not correctly encoded.",
    );
  });

  it("throws when payload contains raw control characters", () => {
    const headerSegment = base64url(header);
    const controlChar = "\u0005";
    const controlCharPayload = `{"ctrl":"${controlChar}"}`;
    const controlSegment = base64urlFromString(controlCharPayload);
    const malformedToken = `${headerSegment}.${controlSegment}.signature`;

    expect(() => jwtDecode(malformedToken)).toThrow("Invalid token specified:");
  });
});
