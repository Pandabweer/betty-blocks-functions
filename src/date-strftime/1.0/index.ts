import { strftime } from "../../utils";
import { addDays, addHours, addMinutes, addMonths, addSeconds, addWeeks, addYears } from "date-fns";

interface DateStrftimeParams {
  datetime: Date | string | number;
  offsetType: string;
  offset: number;
  useUtc: boolean;
  locale: string;
  strftimeDefault: string;
  strftimeStr?: string;
}

const dateStrftime = async ({
  datetime,
  offsetType,
  offset,
  useUtc,
  locale,
  strftimeDefault,
  strftimeStr,
}: DateStrftimeParams): Promise<{ as: string }> => {
  const strFormat = strftimeDefault !== "custom" ? strftimeDefault : strftimeStr;
  let datetimeObject: Date;

  if (!strFormat) {
    throw new Error("Custom strtime is not defined");
  }

  switch (true) {
    case datetime instanceof Date:
      datetimeObject = datetime;
      break;

    case datetime === "now":
    case datetime === "today":
    case datetime === "":
      datetimeObject = new Date();
      break;

    case (typeof datetime === "string" && /^\d+$/.test(datetime)) || typeof datetime === "number": {
      const timestamp = typeof datetime === "number" ? datetime : Number(datetime);
      const timestampInMilliseconds = Math.abs(timestamp) < 1_000_000_000_000
        ? timestamp * 1000
        : timestamp;
      datetimeObject = new Date(timestampInMilliseconds);
      break;
    }

    case typeof datetime === "string":
      datetimeObject = new Date(datetime);
      break;

    default:
      throw new Error(`Invalid date object type (${typeof datetime}) for: ${datetime}`);
  }

  if (isNaN(datetimeObject.getTime())) {
    throw new Error("Invalid datetime input, is the notation correct?");
  }

  if (offset && offsetType) {
    switch (offsetType) {
      case "ss":
        datetimeObject = addSeconds(datetimeObject, offset);
        break;
      case "mm":
        datetimeObject = addMinutes(datetimeObject, offset);
        break;
      case "hh":
        datetimeObject = addHours(datetimeObject, offset);
        break;
      case "DD":
        datetimeObject = addDays(datetimeObject, offset);
        break;
      case "WW":
        datetimeObject = addWeeks(datetimeObject, offset);
        break;
      case "MM":
        datetimeObject = addMonths(datetimeObject, offset);
        break;
      case "YYYY":
        datetimeObject = addYears(datetimeObject, offset);
        break;
    }
  }

  return { as: strftime(strFormat, locale, datetimeObject, 0, useUtc) };
};

export default dateStrftime;
