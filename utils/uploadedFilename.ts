const allowedUploadedExtensions = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".xls",
  ".xlsx",
]);

export function isSafeUploadedFilename(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const filename = value.trim();
  if (!filename) return false;
  if (filename === "undefined" || filename === "null" || filename === "let") {
    return false;
  }
  if (filename.includes("..")) return false;
  if (filename.includes("/")) return false;
  if (filename.includes("\\")) return false;

  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex <= 0) return false;

  const extension = filename.slice(dotIndex).toLowerCase();
  return allowedUploadedExtensions.has(extension);
}

export function isSafePdfFilename(value: unknown): value is string {
  return isSafeUploadedFilename(value) && value.toLowerCase().endsWith(".pdf");
}

export function getPdfEditorHref(invoiceId: unknown, fileName: unknown) {
  const safeId =
    typeof invoiceId === "string" ? invoiceId : String(invoiceId ?? "");
  const encodedId = encodeURIComponent(safeId);

  if (isSafePdfFilename(fileName)) {
    return `/admin/pdf-editor?id=${encodedId}&file=${encodeURIComponent(fileName)}`;
  }

  return `/admin/pdf-editor?id=${encodedId}`;
}
