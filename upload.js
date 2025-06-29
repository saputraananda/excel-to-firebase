const admin = require("firebase-admin");
const axios = require("axios");
const xlsx = require("xlsx");

// Init Firebase
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

// Web API Key (frontend credential)
const API_KEY = "AIzaSyDrOWhW_7eHPwoqk8IlDu2Ea3MeVs9emJc";

// Baca Excel
const workbook = xlsx.readFile("data_new.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

function generateKodeWilayah(row, index) {
    const kodeProvinsi = String(70 + index).padStart(2, '0'); // contoh: 73
    const kodeKabupaten = kodeProvinsi + String(index).padStart(2, '0'); // contoh: 7314
    const kodeKecamatan = kodeKabupaten + "06"; // contoh: 7314060
    const kodeDesa = kodeKecamatan + String(index).padStart(2, '02'); // contoh: 7314060002

    return {
        provinsi: kodeProvinsi,
        kabupatenKota: kodeKabupaten,
        kecamatan: kodeKecamatan,
        desaKelurahan: kodeDesa
    };
}

function clean(value) {
    if (
        value === undefined ||
        value === null ||
        typeof value === "string" && value.trim().toLowerCase() === "tidak diketahui"
    ) {
        return "";
    }
    return value;
}

// Fungsi buat user via REST API
async function ensureUser(email, password) {
    try {
        // Cek apakah user sudah ada
        const existingUser = await admin.auth().getUserByEmail(email);
        console.log(`ℹ️ ${email} sudah ada → UID: ${existingUser.uid}`);

        // Update password agar pasti sinkron
        await admin.auth().updateUser(existingUser.uid, { password });
        console.log(`🔁 Password diperbarui untuk ${email}`);

        return { uid: existingUser.uid };
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            // Kalau belum ada, buat baru
            const newUser = await admin.auth().createUser({ email, password });
            console.log(`✅ ${email} berhasil dibuat → UID: ${newUser.uid}`);
            return { uid: newUser.uid };
        } else {
            console.error(`❌ Error saat cek/buat user ${email}:`, error.message);
            throw error;
        }
    }
}



async function upload() {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const namaDesa = row.namaDesa?.toLowerCase().replace(/\s/g, '') || `desa${i}`;
        const email = `${namaDesa}@gmail.com`;
        const password = "desa123";

        let potensiArr = [];

        if (
            typeof row.potensiDesa === "string" &&
            row.potensiDesa.trim().toLowerCase() === "tidak diketahui"
        ) {
            potensiArr = [];
        } else {
            try {
                potensiArr = JSON.parse(row.potensiDesa || "[]");
            } catch (e) {
                console.warn(`⚠️ potensiDesa baris ${i + 2} gagal di-parse: ${row.potensiDesa}`);
                potensiArr = [];
            }
        }


        try {
            // Buat user Auth dan pastikan password ter-set
            const { uid } = await ensureUser(email, password);
            const kodeWilayah = generateKodeWilayah(row, i);

            // Siapkan data Firestore
            const docData = {
                userId: uid,
                namaDesa: clean(row.namaDesa) || "",
                lokasi: {
                    desaKelurahan: {
                        label: clean(row.desaKelurahan).toUpperCase() || "",
                        value: clean(kodeWilayah.desaKelurahan) || ""
                    },
                    kecamatan: {
                        label: clean(row.kecamatan).toUpperCase() || "",
                        value: clean(kodeWilayah.kecamatan) || ""
                    },
                    kabupatenKota: {
                        label: clean(row.kabupatenKota).toUpperCase() || "",
                        value: clean(kodeWilayah.kabupatenKota) || ""
                    },
                    provinsi: {
                        label: clean(row.provinsi).toUpperCase() || "",
                        value: clean(kodeWilayah.provinsi) || ""
                    }
                },
                latitude: clean(row.latitude) || "",
                longitude: clean(row.longitude) || "",
                deskripsi: clean(row.deskripsi) || "",
                potensiDesa: potensiArr,
                geografisDesa: clean(row.geografisDesa) || "",
                jaringan: clean(row.jaringan) || "",
                kemampuan: clean(row.kemampuan) || "",
                kondisijalan: clean(row.kondisijalan) || "",
                logo: clean(row.logo) || "",
                header: clean(row.header) || "",
                jumlahInovasiDiterapkan: clean(row.jumlahInovasiDiterapkan) || 0,
                kesiapanDigital: clean(row.kesiapanDigital) || "",
                kesiapanTeknologi: clean(row.kesiapanTeknologi) || "",
                infrastrukturDesa: clean(row.infrastrukturDesa) || "",
                pemantapanPelayanan: clean(row.pemantapanPelayanan) || "",
                status: clean(row.status) || "",
                catatanAdmin: clean(row.catatanAdmin) || "",
                instagram: clean(row.instagram) || "",
                listrik: clean(row.listrik) || "",
                sosialBudaya: clean(row.sosialBudaya) || "",
                sumberDaya: clean(row.sumberDaya) || "",
                teknologi: clean(row.teknologi) || "",
                whatsapp: clean(row.whatsapp) || "",
                website: clean(row.website) || "",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                editedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Simpan data ke Firestore
            await db.collection("villages").doc(uid).set(docData);
            console.log(`😀😀😀 ${row.namaDesa} → UID ${uid}`);

            await db.collection("users").doc(uid).set({
                id: uid,
                email,
                role: "village",
            });


        } catch (err) {
            console.error(` ☠️☠️☠️Gagal proses '${row.namaDesa}': ${err.message}`);
        }
    }
}

upload();
