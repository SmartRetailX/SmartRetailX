export interface ParsedRow {
  [key: string]: string;
}

export interface ParsedHeader {
  [key: string]: string;
}

export interface ParsedSheet {
  sheetName: string;
  headers: ParsedHeader;
  rows: ParsedRow[];
}
