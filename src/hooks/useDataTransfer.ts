import { useRef, useState } from "react";
import { toast } from "sonner";
import { db } from "@/db/database";
import { log } from "@/lib/logger";

interface UseDataTransferOptions {
  /** Called after a successful import so the consumer can refresh its data. */
  onImportSuccess?: () => Promise<void> | void;
}

/**
 * Custom hook encapsulating the import/export data-transfer logic.
 *
 * Returns state flags, handler functions, and a hidden-file-input ref that
 * the consumer must attach to an `<input type="file" />` element.
 */
export function useDataTransfer({ onImportSuccess }: UseDataTransferOptions = {}) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const exportData = await db.exportAllData();

      // Create JSON blob
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clarity-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      log.info("Export successful");
      toast.success("Data exported successfully!");
    } catch (error) {
      log.error("Export failed", error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);

      // Read file
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate structure
      if (!importData.data || !importData.version) {
        throw new Error("Invalid backup file format");
      }

      // Import to database
      await db.importAllData(importData);

      // Let the consumer refresh its own data
      await onImportSuccess?.();

      // Notify background worker to reload
      await chrome.runtime.sendMessage({ type: "RELOAD_DATA" });

      toast.success("Data imported successfully!");
      log.info("Import successful");
    } catch (error) {
      log.error("Import failed", error);
      toast.error(
        `Failed to import data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return {
    exporting,
    importing,
    fileInputRef,
    handleExport,
    handleImport,
    handleImportClick,
  };
}
