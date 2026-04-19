import puppeteer from "puppeteer";

const BASE_URL = process.env.RPS_APP_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "Password123!";

const failures = [];

function logStep(message) {
  console.log(`\n[STEP] ${message}`);
}

function recordFailure(message, details) {
  failures.push({ message, details });
  console.error(`[FAIL] ${message}`);
  if (details !== undefined) {
    console.error(JSON.stringify(details, null, 2));
  }
}

function expect(condition, message, details) {
  if (!condition) {
    recordFailure(message, details);
  }
}

async function waitForAppTransition(page) {
  await page.waitForFunction(() => window.location.pathname !== "/login", {
    timeout: 15000,
  }).catch(() => null);
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => null);
}

async function login(browser, { email, path }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await waitForAppTransition(page);
  return { context, page };
}

async function jsonRequest(page, path, { method = "GET", body } = {}) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const response = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      return {
        status: response.status,
        ok: response.ok,
        json,
        text,
      };
    },
    { path, method, body }
  );
}

async function binaryRequest(page, path) {
  return page.evaluate(async (path) => {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    const signature = Array.from(new Uint8Array(buffer.slice(0, 4)));

    return {
      status: response.status,
      ok: response.ok,
      bytes: buffer.byteLength,
      contentType: response.headers.get("content-type"),
      contentDisposition: response.headers.get("content-disposition"),
      signature,
    };
  }, path);
}

function unwrapData(result, message) {
  if (!result.ok || !result.json?.data) {
    recordFailure(message, result);
    return null;
  }

  return result.json.data;
}

function pathOf(page) {
  return new URL(page.url()).pathname;
}

async function assertPageContains(page, text, message) {
  const content = await page.content();
  expect(content.includes(text), message, {
    path: pathOf(page),
    snippet: content.slice(0, 400),
  });
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const suffix = Date.now().toString().slice(-8);

    logStep("Memeriksa direct login landing per role");
    const directDosen = await login(browser, {
      email: "dosen@mtj.local",
      path: "/login",
    });
    expect(pathOf(directDosen.page) === "/rps", "Login langsung dosen harus mendarat ke /rps", {
      actualPath: pathOf(directDosen.page),
    });
    await directDosen.context.close();

    logStep("Menyiapkan master data sebagai admin");
    const admin = await login(browser, {
      email: "admin@mtj.local",
      path: "/admin",
    });
    expect(pathOf(admin.page).startsWith("/admin"), "Admin harus dapat masuk ke area /admin", {
      actualPath: pathOf(admin.page),
    });
    await assertPageContains(admin.page, "Fondasi admin siap dipakai", "Dashboard admin gagal dimuat");

    const usersResult = await jsonRequest(admin.page, "/api/admin/users");
    const users = unwrapData(usersResult, "Gagal memuat user bootstrap") ?? [];
    const kaprodiUser = users.find((user) => user.email === "kaprodi@mtj.local");
    const rmkUser = users.find((user) => user.email === "rmk@mtj.local");
    const dosenUser = users.find((user) => user.role === "dosen" && user.email === "dosen@mtj.local");

    expect(Boolean(kaprodiUser), "User kaprodi bootstrap tidak ditemukan", users);
    expect(Boolean(rmkUser), "User koordinator RMK bootstrap tidak ditemukan", users);
    expect(Boolean(dosenUser), "User dosen bootstrap tidak ditemukan", users);

    const extraDosenEmail = `audit-dosen-${suffix}@mtj.local`;
    const createExtraDosen = await jsonRequest(admin.page, "/api/admin/users", {
      method: "POST",
      body: {
        nama: `Audit Dosen ${suffix}`,
        email: extraDosenEmail,
        nidn: `88${suffix.slice(0, 6)}`,
        role: "dosen",
        password: PASSWORD,
        isActive: true,
      },
    });
    const extraDosen = unwrapData(createExtraDosen, "Gagal membuat dosen pengampu tambahan");

    const createKurikulum = await jsonRequest(admin.page, "/api/admin/kurikulum-versi", {
      method: "POST",
      body: {
        tahun: "2099",
        label: `Kurikulum Audit ${suffix}`,
        isActive: true,
      },
    });
    const kurikulum = unwrapData(createKurikulum, "Gagal membuat kurikulum versi");

    const createRumpun = await jsonRequest(admin.page, "/api/admin/rumpun-mk", {
      method: "POST",
      body: {
        nama: `Rumpun Audit ${suffix}`,
      },
    });
    const rumpun = unwrapData(createRumpun, "Gagal membuat rumpun MK");

    const createCpl = await jsonRequest(admin.page, "/api/admin/cpl-prodi", {
      method: "POST",
      body: {
        kurikulumVersiId: kurikulum?.id,
        kode: `CPL-${suffix}`,
        kategori: "P",
        deskripsi: `Menganalisis kebutuhan pembelajaran audit ${suffix}`,
        urutan: 1,
      },
    });
    const cpl = unwrapData(createCpl, "Gagal membuat CPL Prodi");

    const createMataKuliah = await jsonRequest(admin.page, "/api/admin/mata-kuliah", {
      method: "POST",
      body: {
        kode: `AUD${suffix.slice(-4)}`,
        nama: `Mata Kuliah Audit ${suffix}`,
        rumpunId: rumpun?.id ?? null,
        kurikulumVersiId: kurikulum?.id,
        sksTeori: 2,
        sksPraktik: 1,
        semester: 3,
        isActive: true,
      },
    });
    const mataKuliah = unwrapData(createMataKuliah, "Gagal membuat mata kuliah");
    await admin.context.close();

    logStep("Menguji guard submit dan authoring flow sebagai dosen");
    const dosen = await login(browser, {
      email: "dosen@mtj.local",
      path: "/rps",
    });
    expect(pathOf(dosen.page) === "/rps", "Dosen harus dapat masuk ke halaman /rps", {
      actualPath: pathOf(dosen.page),
    });

    const createGateDraft = await jsonRequest(dosen.page, "/api/rps", {
      method: "POST",
      body: {
        mataKuliahId: mataKuliah?.id,
        tahunAkademik: "2099/2100",
        dosenPengembangId: dosenUser?.id,
        koordinatorRmkId: rmkUser?.id,
        kaprodiId: kaprodiUser?.id,
      },
    });
    const gateDraft = unwrapData(createGateDraft, "Gagal membuat draft RPS untuk uji hard block");

    const submitIncomplete = await jsonRequest(dosen.page, `/api/rps/${gateDraft?.id}/submit`, {
      method: "POST",
    });
    expect(
      submitIncomplete.status >= 400,
      "Submit RPS yang masih kosong harus diblok oleh validasi backend",
      submitIncomplete
    );

    const createFlowDraft = await jsonRequest(dosen.page, "/api/rps", {
      method: "POST",
      body: {
        mataKuliahId: mataKuliah?.id,
        tahunAkademik: "2100/2101",
        dosenPengembangId: dosenUser?.id,
        koordinatorRmkId: rmkUser?.id,
        kaprodiId: kaprodiUser?.id,
      },
    });
    const flowDraft = unwrapData(createFlowDraft, "Gagal membuat draft RPS untuk full flow");
    const rpsId = flowDraft?.id;

    const patchDraft = await jsonRequest(dosen.page, `/api/rps/${rpsId}`, {
      method: "PATCH",
      body: {
        deskripsiSingkat: `Deskripsi audit ${suffix}`,
        bahanKajian: `Bahan kajian audit ${suffix}`,
        catatanTambahan: `Catatan audit ${suffix}`,
        tanggalPenyusunan: "2100-01-10",
      },
    });
    expect(patchDraft.ok, "Update draft RPS gagal", patchDraft);

    const addPengampu = await jsonRequest(dosen.page, `/api/rps/${rpsId}/dosen-pengampu`, {
      method: "POST",
      body: { userId: extraDosen?.id },
    });
    expect(addPengampu.ok, "Menambah dosen pengampu gagal", addPengampu);

    const addCpl = await jsonRequest(dosen.page, `/api/rps/${rpsId}/cpl`, {
      method: "POST",
      body: { cplProdiId: cpl?.id },
    });
    const rpsCpl = unwrapData(addCpl, "Menambahkan CPL ke RPS gagal");

    const createCpmk1 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/cpmk`, {
      method: "POST",
      body: {
        kode: `CPMK-1-${suffix}`,
        deskripsi: "Menganalisis konsep audit pembelajaran",
        urutan: 1,
      },
    });
    const cpmk1 = unwrapData(createCpmk1, "Membuat CPMK pertama gagal");

    const createCpmk2 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/cpmk`, {
      method: "POST",
      body: {
        kode: `CPMK-2-${suffix}`,
        deskripsi: "Menyusun strategi evaluasi pembelajaran",
        urutan: 2,
      },
    });
    const cpmk2 = unwrapData(createCpmk2, "Membuat CPMK kedua gagal");

    const linkCpmkToCpl = await jsonRequest(
      dosen.page,
      `/api/rps/${rpsId}/cpmk/${cpmk1?.id}/cpl`,
      {
        method: "POST",
        body: { rpsCplId: rpsCpl?.id },
      }
    );
    expect(linkCpmkToCpl.ok, "Menghubungkan CPMK ke CPL gagal", linkCpmkToCpl);

    const createSubCpmk1 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/sub-cpmk`, {
      method: "POST",
      body: {
        cpmkId: cpmk1?.id,
        kode: `SCPMK-1-${suffix}`,
        deskripsi: "Menganalisis studi kasus audit RPS",
        urutan: 1,
        targetKetercapaianPersen: 60,
      },
    });
    const subCpmk1 = unwrapData(createSubCpmk1, "Membuat Sub-CPMK pertama gagal");

    const createSubCpmk2 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/sub-cpmk`, {
      method: "POST",
      body: {
        cpmkId: cpmk2?.id,
        kode: `SCPMK-2-${suffix}`,
        deskripsi: "Menyusun rencana evaluasi pembelajaran",
        urutan: 1,
        targetKetercapaianPersen: 40,
      },
    });
    const subCpmk2 = unwrapData(createSubCpmk2, "Membuat Sub-CPMK kedua gagal");

    const createPertemuan1 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/pertemuan`, {
      method: "POST",
      body: {
        mingguKe: 1,
        tipe: "reguler",
        subCpmkId: subCpmk1?.id,
        indikatorPenilaian: ["akurasi analisis"],
        teknikPenilaian: "test",
        kriteriaPenilaian: "rubrik_holistik",
        metodePembelajaran: ["diskusi"],
        bobotPenilaianPersen: 50,
        materiPembelajaran: "Pengantar audit pembelajaran",
        catatanPenugasan: "Tugas analisis awal",
        pbFormula: "2x50",
        ptFormula: "1x50",
        kmFormula: "1x60",
      },
    });
    const pertemuan1 = unwrapData(createPertemuan1, "Membuat pertemuan pertama gagal");

    const createPertemuan2 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/pertemuan`, {
      method: "POST",
      body: {
        mingguKe: 2,
        tipe: "reguler",
        subCpmkId: subCpmk2?.id,
        indikatorPenilaian: ["kelengkapan rencana"],
        teknikPenilaian: "non_test",
        kriteriaPenilaian: "rubrik_deskriptif",
        metodePembelajaran: ["presentasi"],
        bobotPenilaianPersen: 50,
        materiPembelajaran: "Strategi evaluasi pembelajaran",
        catatanPenugasan: "Rancang evaluasi sederhana",
        pbFormula: "2x50",
        ptFormula: "1x50",
        kmFormula: "1x60",
      },
    });
    const pertemuan2 = unwrapData(createPertemuan2, "Membuat pertemuan kedua gagal");

    const createPustaka = await jsonRequest(dosen.page, `/api/rps/${rpsId}/pustaka`, {
      method: "POST",
      body: {
        kategori: "utama",
        teksLengkap: "Audit, A. (2100). Metodologi Pembelajaran Audit.",
        urutan: 1,
      },
    });
    expect(createPustaka.ok, "Menambahkan pustaka gagal", createPustaka);

    const createRtm = await jsonRequest(dosen.page, `/api/rps/${rpsId}/rtm`, {
      method: "POST",
      body: {
        nomorTugas: `TGS-${suffix}`,
        judulTugas: "Audit tugas terstruktur",
        subCpmkId: subCpmk1?.id,
        metodePenugasan: "terstruktur",
        deskripsi: "Analisis audit awal",
        langkahPengerjaan: "Baca kasus lalu susun analisis",
        bentukLuaran: "Laporan singkat",
        indikatorPenilaian: "Ketepatan analisis",
        bobotInternalPersen: 50,
        jadwalPelaksanaan: "Minggu 1",
        catatan: "Kerjakan berkelompok",
        daftarRujukan: "Referensi audit dasar",
      },
    });
    const rtm = unwrapData(createRtm, "Membuat RTM gagal");

    const linkRtm1 = await jsonRequest(dosen.page, `/api/rps/${rpsId}/rtm/${rtm?.id}/pertemuan`, {
      method: "POST",
      body: {
        pertemuanId: pertemuan1?.id,
        keterangan: "Tugas utama minggu 1",
      },
    });
    expect(linkRtm1.ok, "Menghubungkan RTM ke pertemuan pertama gagal", linkRtm1);

    const validateResult = await jsonRequest(dosen.page, `/api/rps/${rpsId}/validate`);
    expect(validateResult.ok, "Endpoint validasi RPS gagal diakses", validateResult);

    const submitRmk = await jsonRequest(dosen.page, `/api/rps/${rpsId}/submit`, {
      method: "POST",
    });
    expect(submitRmk.ok, "Submit RPS ke RMK gagal", submitRmk);
    await dosen.context.close();

    logStep("Menguji review RMK termasuk akses detail");
    const rmk = await login(browser, {
      email: "rmk@mtj.local",
      path: "/review/rmk",
    });
    expect(pathOf(rmk.page) === "/review/rmk", "Koordinator RMK harus masuk ke /review/rmk", {
      actualPath: pathOf(rmk.page),
    });

    await rmk.page.goto(`${BASE_URL}/rps/${rpsId}`, { waitUntil: "networkidle2" });
    expect(
      pathOf(rmk.page) === `/rps/${rpsId}`,
      "Koordinator RMK harus dapat membuka detail RPS dari halaman review",
      { actualPath: pathOf(rmk.page) }
    );

    const shortRejectRmk = await jsonRequest(rmk.page, `/api/rps/${rpsId}/review-rmk`, {
      method: "POST",
      body: {
        action: "reject",
        catatan: "terlalu singkat",
      },
    });
    expect(
      shortRejectRmk.status >= 400 && shortRejectRmk.status < 500,
      "Validasi catatan penolakan RMK minimal 20 karakter harus aktif",
      shortRejectRmk
    );

    const rejectRmk = await jsonRequest(rmk.page, `/api/rps/${rpsId}/review-rmk`, {
      method: "POST",
      body: {
        action: "reject",
        catatan: "Mohon lengkapi catatan audit dan struktur analisis agar lebih konsisten.",
      },
    });
    expect(rejectRmk.ok, "RMK gagal mengirim revisi", rejectRmk);
    await rmk.context.close();

    logStep("Menguji resubmit dari dosen setelah revisi RMK");
    const dosenAfterRmkReject = await login(browser, {
      email: "dosen@mtj.local",
      path: "/rps",
    });
    const resubmitRmk = await jsonRequest(dosenAfterRmkReject.page, `/api/rps/${rpsId}/resubmit`, {
      method: "POST",
    });
    expect(resubmitRmk.ok, "Dosen gagal melakukan resubmit setelah revisi RMK", resubmitRmk);
    await dosenAfterRmkReject.context.close();

    const rmkApprove = await login(browser, {
      email: "rmk@mtj.local",
      path: "/review/rmk",
    });
    const approveRmk = await jsonRequest(rmkApprove.page, `/api/rps/${rpsId}/review-rmk`, {
      method: "POST",
      body: {
        action: "approve",
      },
    });
    expect(approveRmk.ok, "RMK gagal menyetujui RPS", approveRmk);
    await rmkApprove.context.close();

    logStep("Menguji review Kaprodi termasuk akses detail");
    const dosenToKaprodi = await login(browser, {
      email: "dosen@mtj.local",
      path: "/rps",
    });
    const submitKaprodi = await jsonRequest(dosenToKaprodi.page, `/api/rps/${rpsId}/submit-kaprodi`, {
      method: "POST",
    });
    expect(submitKaprodi.ok, "Dosen gagal submit ke Kaprodi", submitKaprodi);
    await dosenToKaprodi.context.close();

    const kaprodi = await login(browser, {
      email: "kaprodi@mtj.local",
      path: "/review/kaprodi",
    });
    expect(pathOf(kaprodi.page) === "/review/kaprodi", "Kaprodi harus masuk ke /review/kaprodi", {
      actualPath: pathOf(kaprodi.page),
    });

    await kaprodi.page.goto(`${BASE_URL}/rps/${rpsId}`, { waitUntil: "networkidle2" });
    expect(
      pathOf(kaprodi.page) === `/rps/${rpsId}`,
      "Kaprodi harus dapat membuka detail RPS dari halaman review",
      { actualPath: pathOf(kaprodi.page) }
    );

    const shortRejectKaprodi = await jsonRequest(kaprodi.page, `/api/rps/${rpsId}/review-kaprodi`, {
      method: "POST",
      body: {
        action: "reject",
        catatan: "terlalu singkat",
      },
    });
    expect(
      shortRejectKaprodi.status >= 400 && shortRejectKaprodi.status < 500,
      "Validasi catatan penolakan Kaprodi minimal 20 karakter harus aktif",
      shortRejectKaprodi
    );

    const rejectKaprodi = await jsonRequest(kaprodi.page, `/api/rps/${rpsId}/review-kaprodi`, {
      method: "POST",
      body: {
        action: "reject",
        catatan: "Mohon rapikan alur final dan pastikan narasi evaluasi lebih eksplisit.",
      },
    });
    expect(rejectKaprodi.ok, "Kaprodi gagal mengirim revisi", rejectKaprodi);
    await kaprodi.context.close();

    logStep("Menguji putaran kedua hingga approved dan export");
    const dosenAfterKaprodiReject = await login(browser, {
      email: "dosen@mtj.local",
      path: "/rps",
    });
    const resubmitAfterKaprodi = await jsonRequest(
      dosenAfterKaprodiReject.page,
      `/api/rps/${rpsId}/resubmit`,
      {
        method: "POST",
      }
    );
    expect(
      resubmitAfterKaprodi.ok,
      "Dosen gagal resubmit setelah revisi Kaprodi",
      resubmitAfterKaprodi
    );
    await dosenAfterKaprodiReject.context.close();

    const rmkSecondApprove = await login(browser, {
      email: "rmk@mtj.local",
      path: "/review/rmk",
    });
    const approveRmkSecond = await jsonRequest(
      rmkSecondApprove.page,
      `/api/rps/${rpsId}/review-rmk`,
      {
        method: "POST",
        body: {
          action: "approve",
        },
      }
    );
    expect(approveRmkSecond.ok, "RMK gagal menyetujui RPS pada putaran kedua", approveRmkSecond);
    await rmkSecondApprove.context.close();

    const dosenSubmitAgain = await login(browser, {
      email: "dosen@mtj.local",
      path: "/rps",
    });
    const submitKaprodiSecond = await jsonRequest(
      dosenSubmitAgain.page,
      `/api/rps/${rpsId}/submit-kaprodi`,
      {
        method: "POST",
      }
    );
    expect(submitKaprodiSecond.ok, "Dosen gagal submit ke Kaprodi pada putaran kedua", submitKaprodiSecond);
    await dosenSubmitAgain.context.close();

    const kaprodiApprove = await login(browser, {
      email: "kaprodi@mtj.local",
      path: "/review/kaprodi",
    });
    const approveKaprodi = await jsonRequest(
      kaprodiApprove.page,
      `/api/rps/${rpsId}/review-kaprodi`,
      {
        method: "POST",
        body: {
          action: "approve",
        },
      }
    );
    expect(approveKaprodi.ok, "Kaprodi gagal menyetujui RPS", approveKaprodi);
    await kaprodiApprove.context.close();

    const dosenFinal = await login(browser, {
      email: "dosen@mtj.local",
      path: "/rps",
    });
    const exportResult = await binaryRequest(dosenFinal.page, `/api/rps/${rpsId}/export`);
    expect(exportResult.ok, "Export PDF akhir gagal", exportResult);
    expect(
      exportResult.contentType === "application/pdf",
      "Export harus mengembalikan content-type PDF",
      exportResult
    );
    expect(exportResult.bytes > 1000, "File PDF hasil export terlalu kecil atau kosong", exportResult);
    expect(
      JSON.stringify(exportResult.signature) === JSON.stringify([37, 80, 68, 70]),
      "Signature file export bukan PDF yang valid",
      exportResult
    );

    const mutateApproved = await jsonRequest(dosenFinal.page, `/api/rps/${rpsId}`, {
      method: "PATCH",
      body: {
        deskripsiSingkat: `Mutasi sesudah approved ${suffix}`,
      },
    });
    expect(
      mutateApproved.status === 403,
      "RPS approved harus immutable terhadap update draft",
      mutateApproved
    );
    await dosenFinal.context.close();
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`\nAudit selesai dengan ${failures.length} kegagalan.`);
    process.exit(1);
  }

  console.log("\nAudit selesai tanpa kegagalan.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
