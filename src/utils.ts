/**
 * Formats a YYYY-MM-DD date string into French layout DD/MM/YYYY.
 */
export function formatDateToFR(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats a French layout DD-MM-YYYY or DD/MM/YYYY date back to YYYY-MM-DD for form elements.
 */
export function formatFRToDate(frStr: string | undefined | null): string {
  if (!frStr) return "";
  const delimiter = frStr.includes("-") ? "-" : "/";
  const parts = frStr.split(delimiter);
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return frStr;
}
