import {
  whereToString,
  whereToObject,
  validateWhereObject,
} from "../../../../src/utils/graphql/utils";
import { LogicalOperator, ComparisonOperator } from "../../../../src/utils/graphql/enums";

describe("Graphql where", () => {
  function _randomLogicalOp(): LogicalOperator {
    const ops = Object.values(LogicalOperator);
    return ops[Math.floor(Math.random() * ops.length)];
  }

  const simpleWhereObject = {
    webuser: {
      firstName: { eq: "John" },
    },
  };
  const simpleWhereString = 'webuser: { firstName: { eq: "John" } }';

  const complexWhereObject = {
    _or: [
      {
        webuser: {
          age: { gt: 30 },
        },
      },
      {
        webuser: {
          isActive: { eq: true },
        },
      },
    ],
  };
  const complexWhereString =
    "_or: [{ webuser: { age: { gt: 30 } } }, { webuser: { isActive: { eq: true } } }]";

  const nestedLogicalWhereObject = {
    _and: [
      {
        _or: [
          { webuser: { firstName: { eq: "Alice" } } },
          { webuser: { lastName: { eq: "Smith" } } },
        ],
      },
      {
        webuser: {
          status: { neq: "inactive" },
        },
      },
    ],
  };
  const nestedLogicalWhereString =
    '_and: [{ _or: [{ webuser: { firstName: { eq: "Alice" } } }, { webuser: { lastName: { eq: "Smith" } } }] }, { webuser: { status: { neq: "inactive" } } }]';

  it("should convert a simple object to a string", () => {
    expect(whereToString(simpleWhereObject)).toEqual(simpleWhereString);
  });

  it("escapes string values in a where clause", () => {
    const where = {
      webuser: {
        displayName: { eq: 'John "Johnny" Smith\nJr.' },
      },
    };

    expect(whereToString(where)).toEqual(
      'webuser: { displayName: { eq: "John \\"Johnny\\" Smith\\nJr." } }',
    );
  });

  it("should convert a complex object with _or to a string", () => {
    expect(whereToString(complexWhereObject)).toEqual(complexWhereString);
  });

  it("should convert a nested logical object to a string", () => {
    expect(whereToString(nestedLogicalWhereObject)).toEqual(nestedLogicalWhereString);
  });

  it("should convert a string back to an object using whereToObject", () => {
    expect(whereToObject(simpleWhereString)).toEqual(simpleWhereObject);
  });

  it("should convert complex string with _or back to object", () => {
    expect(whereToObject(complexWhereString)).toEqual(complexWhereObject);
  });

  it("should preserve symmetry between toString and toObject", () => {
    const string = whereToString(nestedLogicalWhereObject);
    const convertedBack = whereToObject(string);

    expect(convertedBack).toEqual(nestedLogicalWhereObject);
  });

  it("should throw if where is not an object or is null", () => {
    // @ts-expect-error Testing invalid input
    expect(() => validateWhereObject(null)).toThrow("Where clause must be a non-null object");
    // @ts-expect-error Testing invalid input
    expect(() => validateWhereObject("string")).toThrow("Where clause must be a non-null object");
    // @ts-expect-error Testing invalid input
    expect(() => validateWhereObject(123)).toThrow("Where clause must be a non-null object");
  });

  it("should not try to parse an array from an in operator object", () => {
    const where = {
      webuser: {
        age: { in: [101, 62] },
      },
    };

    expect(() => validateWhereObject(where)).not.toThrow();
  });

  describe("validateWhereObject", () => {
    it("allows valid comparison operator directly on a field (line 33)", () => {
      const validWhere = {
        age: {
          [ComparisonOperator.EQ]: 30,
        },
      };

      expect(() => validateWhereObject(validWhere)).not.toThrow();
    });
  });

  it("should throw if a logical operator value is not an array", () => {
    const where = { [_randomLogicalOp()]: {} };

    expect(() => validateWhereObject(where)).toThrow(/has to be an array/);
  });

  it("should throw if logical operator array elements are invalid", () => {
    const where = {
      _or: [{ webuser: { firstName: { eq: "John" } } }, "invalidElement"],
    };

    expect(() => validateWhereObject(where)).toThrow(
      /Error in '_or' array element at index 1: Where clause must be a non-null object/,
    );
  });

  it("should throw if a field's value is not an object", () => {
    const where = {
      webuser: "notAnObject",
    };

    expect(() => validateWhereObject(where)).toThrow(/Field 'webuser' must be an object/);
  });

  it("should throw if condition on field is not an object", () => {
    const where = {
      webuser: {
        firstName: "notAnObject",
      },
    };

    expect(() => validateWhereObject(where)).toThrow(
      /Condition on field 'firstName' must be an object/,
    );
  });

  it("should throw if condition contains more than one operator", () => {
    const where = {
      webuser: {
        firstName: {
          eq: "John",
          neq: "Doe",
        },
      },
    };

    expect(() => validateWhereObject(where)).toThrow(/cannot contain more than one operator/);
  });

  it("should throw if condition operator is invalid", () => {
    const where = {
      webuser: {
        firstName: {
          invalidOp: "test",
        },
      },
    };

    expect(() => validateWhereObject(where)).toThrow(
      /Invalid operator 'invalidOp' on field 'firstName'/,
    );
  });

  it("should pass validation for a simple valid where object", () => {
    const where = {
      webuser: {
        firstName: { eq: "John" },
      },
    };

    expect(() => validateWhereObject(where)).not.toThrow();
  });

  it("should pass validation for complex nested logical operators", () => {
    const where = {
      _and: [
        {
          _or: [
            { webuser: { firstName: { eq: "Alice" } } },
            { webuser: { lastName: { eq: "Smith" } } },
          ],
        },
        {
          webuser: { status: { neq: "inactive" } },
        },
      ],
    };

    expect(() => validateWhereObject(where)).not.toThrow();
  });
});
