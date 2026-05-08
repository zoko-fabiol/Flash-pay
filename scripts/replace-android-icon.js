#!/usr/bin/env node
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration des résolutions Android
const RESOLUTIONS = {
  'mipmap-ldpi': 36,
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const LANDSCAPE_RESOLUTIONS = {
  'drawable-land-ldpi': 32,
  'drawable-land-mdpi': 48,
  'drawable-land-hdpi': 72,
  'drawable-land-xhdpi': 96,
  'drawable-land-xxhdpi': 144,
  'drawable-land-xxxhdpi': 192,
};

const PORTRAIT_RESOLUTIONS = {
  'drawable-port-ldpi': 32,
  'drawable-port-mdpi': 48,
  'drawable-port-hdpi': 72,
  'drawable-port-xhdpi': 96,
  'drawable-port-xxhdpi': 144,
  'drawable-port-xxxhdpi': 192,
};

async function replaceAndroidIcon(sourceImagePath) {
  try {
    // Vérifier que le fichier source existe
    if (!fs.existsSync(sourceImagePath)) {
      console.error(`❌ Erreur: Le fichier ${sourceImagePath} n'existe pas`);
      process.exit(1);
    }

    console.log(`✅ Image source chargée: ${sourceImagePath}\n`);

    const basePath = 'android/app/src/main/res';

    // Traiter les résolutions mipmap
    console.log('📱 Traitement des icônes mipmap...');
    for (const [dirname, size] of Object.entries(RESOLUTIONS)) {
      const dirPath = path.join(basePath, dirname);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Créer ic_launcher.png
      await sharp(sourceImagePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(dirPath, 'ic_launcher.png'));
      console.log(`  ✅ ${dirname}/ic_launcher.png (${size}x${size})`);

      // Créer ic_launcher_round.png
      await sharp(sourceImagePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(dirPath, 'ic_launcher_round.png'));
      console.log(`  ✅ ${dirname}/ic_launcher_round.png (${size}x${size})`);
    }

    // Traiter les résolutions landscape
    console.log('\n🎨 Traitement des résolutions landscape...');
    for (const [dirname, size] of Object.entries(LANDSCAPE_RESOLUTIONS)) {
      const dirPath = path.join(basePath, dirname);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      await sharp(sourceImagePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(dirPath, 'ic_launcher.png'));
      console.log(`  ✅ ${dirname}/ic_launcher.png (${size}x${size})`);
    }

    // Traiter les résolutions portrait
    console.log('\n🎨 Traitement des résolutions portrait...');
    for (const [dirname, size] of Object.entries(PORTRAIT_RESOLUTIONS)) {
      const dirPath = path.join(basePath, dirname);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      await sharp(sourceImagePath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(dirPath, 'ic_launcher.png'));
      console.log(`  ✅ ${dirname}/ic_launcher.png (${size}x${size})`);
    }

    console.log('\n✨ Toutes les icônes Android ont été remplacées avec succès!');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

const sourceImage = process.argv[2] || 'assets/icon.png';
replaceAndroidIcon(sourceImage);
