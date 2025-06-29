const admin = require("firebase-admin");

// Init Firebase
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();

async function deleteAllUsers(nextPageToken) {
  try {
    const listUsersResult = await auth.listUsers(1000, nextPageToken); // ambil max 1000 user per page

    const uids = listUsersResult.users.map(user => user.uid);
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      console.log(`✅ ${uids.length} user berhasil dihapus`);
    } else {
      console.log("✅ Tidak ada user yang ditemukan");
    }

    // Kalau ada halaman selanjutnya, hapus juga
    if (listUsersResult.pageToken) {
      return deleteAllUsers(listUsersResult.pageToken);
    }

    console.log("🚮 Semua user berhasil dihapus");
  } catch (error) {
    console.error("❌ Gagal menghapus user:", error.message);
  }
}

deleteAllUsers();
