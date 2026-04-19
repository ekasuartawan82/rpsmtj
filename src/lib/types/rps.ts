import { z } from "zod";

export const indikatorPenilaianSchema = z.array(z.string().trim().min(1)).default([]);
export const metodePembelajaranSchema = z.array(z.string().trim().min(1)).default([]);

export type IndikatorPenilaian = z.infer<typeof indikatorPenilaianSchema>;
export type MetodePembelajaran = z.infer<typeof metodePembelajaranSchema>;

export function parseIndikatorPenilaian(value: unknown): IndikatorPenilaian {
  return indikatorPenilaianSchema.parse(value ?? []);
}

export function parseMetodePembelajaran(value: unknown): MetodePembelajaran {
  return metodePembelajaranSchema.parse(value ?? []);
}
