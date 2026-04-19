import { requireRole } from "@/lib/auth/session";
import { listUsers } from "@/services/admin";
import { listDosenRpsDashboard, listRpsCreationMataKuliahOptions } from "@/services/rps";

import { RpsListPanel } from "./rps-list-panel";

export default async function RpsListPage() {
  const session = await requireRole("dosen");
  const [rpsList, mataKuliahOptions, allUsers] = await Promise.all([
    listDosenRpsDashboard(session.user.id),
    listRpsCreationMataKuliahOptions(),
    listUsers(),
  ]);

  // Filter for active users only
  const dosenOptions = allUsers.filter((u) => u.isActive);

  return (
    <>
      <div className="mb-10">
        <span className="inline-block rounded-full bg-[#f3f3f5] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#6e6e73]">
          RPS Dosen
        </span>
        <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-[#1d1d1f]">
          Kelola Rencana Pembelajaran Semester
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
          Akses dan kelola seluruh dokumen silabus mata kuliah Anda. Buat RPS baru, ajukan
          persetujuan ke RMK, atau perbarui dokumen yang sudah ada.
        </p>
      </div>

      <RpsListPanel
        initialRps={rpsList}
        mataKuliahOptions={mataKuliahOptions}
        dosenOptions={dosenOptions}
        currentUserId={session.user.id}
      />
    </>
  );
}
