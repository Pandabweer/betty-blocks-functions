import dateStrftime from "../src/date-strftime/1.0/index";
import { strftime } from "../src/utils";

jest.mock("../src/utils", () => ({
  strftime: jest.fn(),
}));

describe("dateStrftime", () => {
  const mockStrftime = strftime as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should format a valid Date object with default format", async () => {
    const date = new Date("2024-05-20T12:00:00Z");
    mockStrftime.mockReturnValue("formatted-date");

    const result = await dateStrftime({
      datetime: date,
      offsetType: "mm",
      offset: 0,
      useUtc: false,
      locale: "en",
      strftimeDefault: "%Y-%m-%d",
    });

    expect(result).toEqual({ as: "formatted-date" });
    expect(mockStrftime).toHaveBeenCalledWith("%Y-%m-%d", "en", date, 0, false);
  });

  it("should format a custom format string", async () => {
    mockStrftime.mockReturnValue("custom-format");

    const result = await dateStrftime({
      datetime: "2024-01-01T00:00:00Z",
      offsetType: "mm",
      offset: 0,
      useUtc: true,
      locale: "en",
      strftimeDefault: "custom",
      strftimeStr: "%d/%m/%Y",
    });

    expect(result).toEqual({ as: "custom-format" });
    expect(mockStrftime).toHaveBeenCalled();
  });

  it("should use current date when datetime is 'now'", async () => {
    const now = new Date();
    const spy = jest.spyOn(global, "Date").mockImplementation(() => now as Date);
    mockStrftime.mockReturnValue("now-date");

    const result = await dateStrftime({
      datetime: "now",
      offsetType: "mm",
      offset: 0,
      useUtc: false,
      locale: "en",
      strftimeDefault: "%x",
    });

    expect(result).toEqual({ as: "now-date" });
    spy.mockRestore();
  });

  it("should handle numeric UNIX timestamp input", async () => {
    const timestamp = 1716912000;
    const expectedDate = new Date(timestamp * 1000);
    mockStrftime.mockReturnValue("timestamp-date");

    const result = await dateStrftime({
      datetime: timestamp,
      offsetType: "mm",
      offset: 0,
      useUtc: false,
      locale: "en",
      strftimeDefault: "%x",
    });

    expect(result).toEqual({ as: "timestamp-date" });
    expect(mockStrftime).toHaveBeenCalledWith("%x", "en", expectedDate, 0, false);
  });

  it("should apply offset correctly for 'hh'", async () => {
    const baseDate = new Date("2024-06-01T10:00:00Z");
    mockStrftime.mockReturnValue("offset-date");

    const result = await dateStrftime({
      datetime: baseDate,
      offsetType: "hh",
      offset: 2,
      useUtc: false,
      locale: "en",
      strftimeDefault: "%x",
    });

    expect(result).toEqual({ as: "offset-date" });
    expect(mockStrftime).toHaveBeenCalledWith(
      "%x",
      "en",
      new Date("2024-06-01T12:00:00Z"),
      0,
      false,
    );
  });

  it("should throw an error for missing custom format", async () => {
    await expect(
      dateStrftime({
        datetime: "2024-01-01",
        offsetType: "mm",
        offset: 0,
        useUtc: false,
        locale: "en",
        strftimeDefault: "custom",
        strftimeStr: undefined,
      }),
    ).rejects.toThrow("Custom strtime is not defined");
  });

  it("should throw an error for invalid date input", async () => {
    await expect(
      dateStrftime({
        datetime: "not-a-date",
        offsetType: "mm",
        offset: 0,
        useUtc: false,
        locale: "en",
        strftimeDefault: "%x",
      }),
    ).rejects.toThrow("Invalid datetime input, is the notation correct?");
  });

  it("should throw an error if strftimeDefault is 'custom' and strftimeStr is missing", async () => {
    await expect(
      dateStrftime({
        datetime: "2024-01-01",
        offsetType: "mm",
        offset: 0,
        useUtc: false,
        locale: "en",
        strftimeDefault: "custom",
      }),
    ).rejects.toThrow("Custom strtime is not defined");
  });

  it("parses string date correctly", async () => {
    mockStrftime.mockReturnValue("string-date");
    await expect(
      dateStrftime({
        datetime: "2024-06-01T10:00:00Z",
        offsetType: "mm",
        offset: 0,
        useUtc: false,
        locale: "en",
        strftimeDefault: "%Y",
      }),
    ).resolves.toEqual({ as: "string-date" });
  });

  it("parses numeric string timestamp", async () => {
    const timestamp = "1716912000";
    mockStrftime.mockReturnValue("unix-str");
    await expect(
      dateStrftime({
        datetime: timestamp,
        offsetType: "mm",
        offset: 0,
        useUtc: false,
        locale: "en",
        strftimeDefault: "%Y",
      }),
    ).resolves.toEqual({ as: "unix-str" });

    expect(mockStrftime).toHaveBeenCalledWith(
      "%Y",
      "en",
      new Date("2024-05-28T16:00:00.000Z"),
      0,
      false,
    );
  });

  it("parses millisecond timestamps consistently for strings and numbers", async () => {
    const timestamp = 1716912000000;
    mockStrftime.mockReturnValue("unix-ms");

    await dateStrftime({
      datetime: String(timestamp),
      offsetType: "mm",
      offset: 0,
      useUtc: true,
      locale: "en",
      strftimeDefault: "%Y",
    });

    expect(mockStrftime).toHaveBeenCalledWith("%Y", "en", new Date(timestamp), 0, true);
  });

  const baseDate = new Date("2024-06-01T00:00:00Z");

  it.each([
    ["ss", 60, "2024-06-01T00:01:00.000Z"],
    ["mm", 15, "2024-06-01T00:15:00.000Z"],
    ["hh", 2, "2024-06-01T02:00:00.000Z"],
    ["DD", 1, "2024-06-02T00:00:00.000Z"],
    ["WW", 1, "2024-06-08T00:00:00.000Z"],
    ["MM", 1, "2024-07-01T00:00:00.000Z"],
    ["YYYY", 1, "2025-06-01T00:00:00.000Z"],
  ])("applies offsetType %s correctly", async (offsetType, offset, expectedDate) => {
    mockStrftime.mockReturnValue("offset-test");

    const result = await dateStrftime({
      datetime: baseDate,
      offsetType: offsetType as string,
      offset,
      useUtc: false,
      locale: "en",
      strftimeDefault: "%x",
    });

    expect(result).toEqual({ as: "offset-test" });
    expect(mockStrftime).toHaveBeenCalledWith("%x", "en", new Date(expectedDate), 0, false);
  });

  it("uses calendar arithmetic for month offsets", async () => {
    const endOfJanuary = new Date("2024-01-31T00:00:00Z");
    mockStrftime.mockReturnValue("calendar-month");

    await dateStrftime({
      datetime: endOfJanuary,
      offsetType: "MM",
      offset: 1,
      useUtc: true,
      locale: "en",
      strftimeDefault: "%x",
    });

    expect(mockStrftime).toHaveBeenCalledWith(
      "%x",
      "en",
      new Date("2024-02-29T00:00:00Z"),
      0,
      true,
    );
  });

  it("should throw an error for completely invalid datetime type", async () => {
    await expect(
      dateStrftime({
        datetime: { unexpected: "object" } as never,
        offsetType: "mm",
        offset: 0,
        useUtc: false,
        locale: "en",
        strftimeDefault: "%x",
      }),
    ).rejects.toThrow("Invalid date object type (object) for: [object Object]");
  });
});
