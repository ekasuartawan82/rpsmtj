import { requireRole } from "@/lib/auth/session";
import { listUsers } from "@/services/admin";

import { UsersAdminPanel } from "./users-admin-panel";

export default async function AdminUsersPage() {
  const session = await requireRole("admin");
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6e6e73]">Users</p>
        <h2 className="mt-4 font-heading text-4xl text-slate-950">
          CRUD akun sudah siap untuk dipakai admin.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Semua operasi users lewat service layer dan route handler admin yang tervalidasi Zod.
          Area ini mendukung create, update, ganti role, dan aktivasi/nonaktivasi akun.
        </p>
      </section>

      <UsersAdminPanel users={users} currentAdminId={session.user.id} />
    </div>
  );
}
