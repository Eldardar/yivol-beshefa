"use client";
import { buildXlsx, type XlsxSheet } from "@/lib/xlsx";
import { jerusalemDate } from "@/lib/dates";
import { DownloadIcon } from "./icons";

type ExportProps = { fileName: string; sheets: () => XlsxSheet[]; label?: string };

export function ExportExcelButton(props: ExportProps) {
  return (
    <div className="report-export">
      <ExcelDownloadButton {...props} />
    </div>
  );
}

// Sheets are built on click, so reports don't pay for export data on every render.
export function ExcelDownloadButton({ fileName, sheets, label = "ייצוא לאקסל" }: ExportProps) {
  function download() {
    const blob = new Blob([buildXlsx(sheets()) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName.replace(/[\\/:*?"<>|]/g, "-")} ${jerusalemDate()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <button type="button" className="btn btn-sm secondary" onClick={download}>
      <DownloadIcon size={18} />
      {label}
    </button>
  );
}
