import HBS from "handlebars";

HBS.registerHelper("ifEquals", (arg1: any, arg2: any, options: any) => {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this);
});

HBS.registerHelper("json", (context: any) => {
  if (!context) return 'undefined';
  return JSON.stringify(context);
});

// a helper to convert bytes to human readable format
HBS.registerHelper("bytesToSize", (bytes: number) => {
  if (isNaN(bytes) || bytes === null) return "0 Byte";
  var i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return +((bytes / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
});

// a helper to convert seconds to human readable format
HBS.registerHelper("secondsToTime", (seconds: number) => {
  if (isNaN(seconds) || seconds === null) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const hoursStr = hours > 0 ? `${hours}h` : "";
  const minutesStr = minutes > 0 ? `${minutes}m` : "";
  const secondsStr = secs > 0 ? `${secs}s` : "";

  const result = [];
  if (hoursStr) result.push(hoursStr);
  if (minutesStr) result.push(minutesStr);
  if (secondsStr) result.push(secondsStr);

  if (result.length === 0) return "0s";

  return result.join(" ");
});

// a helper to convert date to time left or time passed
HBS.registerHelper("timeLeft", (date: Date) => {
  if (!date) return "";

  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 0) {
    return `${HBS.helpers.secondsToTime(-seconds)} ago`;
  }
  return `in ${HBS.helpers.secondsToTime(seconds)}`;
});

// a helper to show date like DD-MM-YYYY HH:MM:SS
HBS.registerHelper("date", (date: Date) => {
  if (!date) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  
  const timezoneOffset = date.getTimezoneOffset();
  const offset = Math.abs(timezoneOffset)
  const offsetOperator = timezoneOffset < 0 ? '+' : '-'
  const offsetHours = Math.floor(offset / 60).toString().padStart(2, '0')
  const offsetMinutes = Math.floor(offset % 60).toString().padStart(2, '0')

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} UTC${offsetOperator}${offsetHours}:${offsetMinutes}`;
});

// uppercase
HBS.registerHelper("upper", (str: string) => {
  return str.toUpperCase();
});

HBS.registerHelper("divide", (a: number, b: number) => {
  return a / b;
});

HBS.registerHelper('tail', (text: string, length: number) => {  
  return text.substring(0, length);
});

HBS.registerHelper('gt', (a: number, b: number) => {
  return a > b;
});

HBS.registerHelper('lt', (a: number, b: number) => {
  return a < b;
});

HBS.registerHelper('gte', (a: number, b: number) => {
  return a >= b;
});

HBS.registerHelper('lte', (a: number, b: number) => {
  return a <= b;
});

HBS.registerHelper('length', (arr: unknown[]) => {
  return arr.length;
});