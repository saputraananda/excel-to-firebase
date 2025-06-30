const admin = require('firebase-admin');
const ExcelJS = require('exceljs');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// List koleksi yang mau diekspor
const collections = ['claimInnovations', 'innovations', 'innovators', 'users', 'villages'];

async function exportAllCollectionsToExcel() {
  const workbook = new ExcelJS.Workbook();

  for (const collectionName of collections) {
    const sheet = workbook.addWorksheet(collectionName);
    const snapshot = await db.collection(collectionName).get();

    if (snapshot.empty) {
      sheet.addRow(['(No data)']);
      continue;
    }

    // Ambil keys dari dokumen pertama sebagai header
    const firstDoc = snapshot.docs[0];
    const headers = ['id', ...Object.keys(firstDoc.data())];
    sheet.addRow(headers);

    // Isi data baris per baris
    snapshot.forEach(doc => {
      const row = [doc.id];
      headers.slice(1).forEach(key => {
        row.push(doc.data()[key] ?? '');
      });
      sheet.addRow(row);
    });
  }

  await workbook.xlsx.writeFile('firestore_export.xlsx');
  console.log('✅ Semua koleksi berhasil diekspor ke firestore_export.xlsx');
}

exportAllCollectionsToExcel().catch(console.error);
