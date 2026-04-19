import { renderRpsDocument } from "@/lib/templates/rps/render-rps-document";

import { assembleRpsDocument } from "./assemble-rps-document";
import { validateRpsDocument } from "./validate-rps-document";
import type { ExportRpsHtmlOptions } from "./types";

export async function exportRpsHtml(rpsId: string, options: ExportRpsHtmlOptions) {
  const data = await assembleRpsDocument(rpsId, options);
  validateRpsDocument(data);
  return renderRpsDocument(data, options);
}

