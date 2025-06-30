const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const collections = ['claimInnovations', 'innovations', 'innovators', 'users', 'villages'];

async function exportCollectionToCSV(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log(`❌ Koleksi ${collectionName} kosong.`);
    return;
  }

  const firstDoc = snapshot.docs[0];
  const headers = ['id', ...Object.keys(firstDoc.data())];

  const rows = [headers.join(',')]; // baris header

  snapshot.forEach(doc => {
    const data = doc.data();
    const row = [doc.id];
    headers.slice(1).forEach(key => {
      const value = data[key] !== undefined ? `"${String(data[key]).replace(/"/g, '""')}"` : '';
      row.push(value);
    });
    rows.push(row.join(','));
  });

  const outputPath = path.join(__dirname, `${collectionName}.csv`);
  fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
  console.log(`✅ Koleksi ${collectionName} disimpan di: ${outputPath}`);
}

async function runExport() {
  for (const collection of collections) {
    await exportCollectionToCSV(collection);
  }
}

runExport().catch(console.error);
