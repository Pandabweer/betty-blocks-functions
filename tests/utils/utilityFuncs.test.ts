import {
  chunkArray,
  variableMap,
  formatStringMap,
  strftime,
} from "../../src/utils/utilityFuncs";

describe("chunkArray", () => {
  it("should chunk an array into smaller arrays of given size", () => {
    const array = [1, 2, 3, 4, 5, 6, 7];
    const chunkSize = 3;

    const chunks = Array.from(chunkArray(array, chunkSize));

    expect(chunks).toStrictEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("should handle an array smaller than the chunk size", () => {
    const array = [1, 2];
    const chunkSize = 5;

    const chunks = Array.from(chunkArray(array, chunkSize));

    expect(chunks).toStrictEqual([[1, 2]]);
  });

  it("should handle an empty array", () => {
    const array: number[] = [];
    const chunkSize = 3;

    const chunks = Array.from(chunkArray(array, chunkSize));

    expect(chunks).toStrictEqual([]);
  });

  it("should handle a chunk size of 1", () => {
    const array = [1, 2, 3];
    const chunkSize = 1;

    const chunks = Array.from(chunkArray(array, chunkSize));

    expect(chunks).toStrictEqual([[1], [2], [3]]);
  });

  it("should handle a chunk size equal to array length", () => {
    const array = [1, 2, 3, 4];
    const chunkSize = 4;

    const chunks = Array.from(chunkArray(array, chunkSize));

    expect(chunks).toStrictEqual([[1, 2, 3, 4]]);
  });

  it("should throw a RangeError if chunkSize is 0 or lower", () => {
    const array = [1, 2, 3];

    expect(() => Array.from(chunkArray(array, 0))).toThrow(RangeError);
    expect(() => Array.from(chunkArray(array, -1))).toThrow(RangeError);
  });
});

describe("variableMap", () => {
  test("should convert an array of key-value pairs into an object", () => {
    const input = [
      { key: "a", value: "1" },
      { key: "b", value: "2" },
      { key: "c", value: "3" },
    ];

    expect(variableMap(input)).toStrictEqual({ a: "1", b: "2", c: "3" });
  });

  test("should return an empty object when given an empty array", () => {
    expect(variableMap([])).toStrictEqual({});
  });

  test("should handle duplicate keys by using the last occurrence", () => {
    const input = [
      { key: "a", value: "1" },
      { key: "b", value: "2" },
      { key: "a", value: "3" },
    ];

    expect(variableMap(input)).toStrictEqual({ a: "3", b: "2" });
  });

  test("should handle keys with empty string values", () => {
    const input = [
      { key: "a", value: "" },
      { key: "b", value: "2" },
    ];

    expect(variableMap(input)).toStrictEqual({ a: "", b: "2" });
  });

  test("should handle an array with a single key-value pair", () => {
    const input = [{ key: "x", value: "y" }];
    const expectedOutput = { x: "y" };

    expect(variableMap(input)).toStrictEqual(expectedOutput);
  });
});

describe("formatStringMap", () => {
  test("should replace variables correctly", () => {
    const text = "Hello, {{ name }}!";
    const variables = [{ key: "name", value: "Alice" }];

    expect(formatStringMap(text, variables)).toBe("Hello, Alice!");
  });

  test("should replace multiple occurrences of the same variable", () => {
    const text = "{{ greeting }}, {{ name }}! {{ greeting }}, again!";
    const variables = [
      { key: "greeting", value: "Hi" },
      { key: "name", value: "Bob" },
    ];

    expect(formatStringMap(text, variables)).toBe("Hi, Bob! Hi, again!");
  });

  test("should leave unknown variables unchanged and log warning", () => {
    console.log = jest.fn();
    const text = "Welcome, {{ user }}!";
    const variables = [{ key: "name", value: "Charlie" }];

    expect(formatStringMap(text, variables)).toBe("Welcome, {{ user }}!");
    expect(console.log).toHaveBeenCalledWith(
      "Unknown map variable 'user' in text field",
    );
  });

  test("should handle special character prefixes correctly", () => {
    const text = "Escaped: {{{ name }}} and {{ value }}";
    const variables = [
      { key: "name", value: "John" },
      { key: "value", value: "Doe" },
    ];

    expect(formatStringMap(text, variables)).toBe("Escaped: John and Doe");
  });

  test("should handle an empty variables array", () => {
    const text = "Hello, {{ name }}!";
    const variables: { key: string; value: string }[] = [];

    expect(formatStringMap(text, variables)).toBe("Hello, {{ name }}!");
  });

  test("should return original text when there are no placeholders", () => {
    const text = "No placeholders here.";
    const variables = [{ key: "unused", value: "value" }];

    expect(formatStringMap(text, variables)).toBe("No placeholders here.");
  });

  test("should handle overlapping variable names correctly", () => {
    const text = "{{ var }} and {{ variable }}";
    const variables = [
      { key: "var", value: "one" },
      { key: "variable", value: "two" },
    ];

    expect(formatStringMap(text, variables)).toBe("one and two");
  });
});

describe("strftime", () => {
  const mockDate = new Date("2023-10-05T14:30:45Z");
  const timeZoneReg = /^(GMT|UTC)[+-](1[0-2]|[0-9])$/;
  const timeZoneOffsetReg = /^(\+|-)\d{4}$/;

  beforeAll(() => {
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should format %Y-%m-%d correctly", () => {
    expect(strftime("%Y-%m-%d")).toBe("2023-10-05");
  });

  it("should format %H:%M:%S correctly", () => {
    expect(strftime("%H:%M:%S")).toBe("14:30:45");
  });

  it("should format %I:%M %p correctly", () => {
    expect(strftime("%I:%M %p")).toBe("02:30 PM");
  });

  it("should format %A, %B %d, %Y correctly", () => {
    expect(strftime("%A, %B %d, %Y")).toBe("Thursday, October 05, 2023");
  });

  it("should format %j (day of the year) correctly", () => {
    expect(strftime("%j")).toBe("278");
  });

  it("should format %V (ISO week number) correctly", () => {
    expect(strftime("%V")).toBe("40");
  });

  it("should format %z (timezone offset) correctly", () => {
    expect(strftime("%z")).toMatch(timeZoneOffsetReg);
  });

  it("should format %Zs (short timezone name) correctly", () => {
    expect(strftime("%Zs")).toMatch(timeZoneReg);
  });

  it("should handle unknown format specifiers by returning them as-is", () => {
    expect(strftime("%Q")).toBe("%Q");
  });

  it("should handle empty format string", () => {
    expect(strftime("")).toBe("");
  });

  it("should handle invalid format string (non-string input)", () => {
    expect(strftime(123 as any)).toBe("");
  });
});
