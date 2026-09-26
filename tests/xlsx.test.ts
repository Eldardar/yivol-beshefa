import { describe, expect, it } from "vitest";
import { inflateRawSync } from "node:zlib";
import { buildXlsx } from "@/lib/xlsx";

// Walks the zip's central directory and returns each entry's text, so the test checks the real archive layout.
function readZip(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const method = view.getUint16(pos + 10, true);
    const size = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const data = bytes.subarray(dataStart, dataStart + size);
    files[name] = new TextDecoder().decode(method === 0 ? data : inflateRawSync(data));
    pos += 46 + nameLength;
  }
  return files;
}

describe("buildXlsx", () => {
  const files = readZip(
    buildXlsx([
      { name: "משמרות", header: ["תאריך", "חקלאי", "סה\"כ"], rows: [[{ date: "2026-09-26" }, "כהן & בניו <בע\"מ>", { money: 1234.5 }], [null, 7, undefined]], footer: ["סה\"כ", null, { money: 1234.5 }] },
      { name: "דוח: 1/9", header: ["x"], rows: [] },
      { name: "דוח  1 9", header: ["x"], rows: [] }
    ])
  );

  it("packages a workbook with one worksheet part per sheet", () => {
    expect(Object.keys(files)).toEqual(expect.arrayContaining(["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet3.xml"]));
  });

  it("writes typed, escaped, right-to-left cells", () => {
    const sheet = files["xl/worksheets/sheet1.xml"]!;
    expect(sheet).toContain('rightToLeft="1"');
    expect(sheet).toContain('<c r="A2" s="4"><v>46291</v></c>');
    expect(sheet).toContain("כהן &amp; בניו &lt;בע&quot;מ&gt;");
    expect(sheet).toContain('<c r="C2" s="2"><v>1234.5</v></c>');
    expect(sheet).toContain('<c r="B3"><v>7</v></c>');
    expect(sheet).toContain('<c r="C4" s="3"><v>1234.5</v></c>');
  });

  it("makes sheet names valid and unique", () => {
    const workbook = files["xl/workbook.xml"]!;
    expect(workbook).toContain('name="דוח  1 9"');
    expect(workbook).toContain('name="דוח  1 9 2"');
  });
});
