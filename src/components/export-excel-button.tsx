"use client";
import { buildXlsx, type XlsxSheet } from "@/lib/xlsx";
import { jerusalemDate } from "@/lib/dates";
import { DownloadIcon } from "./icons";

// Sheets are built on click, so reports don't pay for export data on every render.
export function ExportExcelButton({ fileName, sheets }: { fileName: string; sheets: () => XlsxSheet[] }) {
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
    <div className="report-export">
      <button type="button" className="btn btn-sm secondary" onClick={download}>
        <DownloadIcon size={18} />
        ייצוא לאקסל
      </button>
    </div>
  );
}
