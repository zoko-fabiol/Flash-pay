#!/usr/bin/env python3
"""
Script pour remplacer l'icône Android en générant les différentes résolutions
"""
import os
from PIL import Image
import sys

# Configuration des résolutions Android
RESOLUTIONS = {
    'mipmap-ldpi': 36,
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

LANDSCAPE_RESOLUTIONS = {
    'drawable-land-ldpi': 32,
    'drawable-land-mdpi': 48,
    'drawable-land-hdpi': 72,
    'drawable-land-xhdpi': 96,
    'drawable-land-xxhdpi': 144,
    'drawable-land-xxxhdpi': 192,
    'drawable-land-night-ldpi': 32,
    'drawable-land-night-mdpi': 48,
    'drawable-land-night-hdpi': 72,
    'drawable-land-night-xhdpi': 96,
    'drawable-land-night-xxhdpi': 144,
    'drawable-land-night-xxxhdpi': 192,
}

PORTRAIT_RESOLUTIONS = {
    'drawable-port-ldpi': 32,
    'drawable-port-mdpi': 48,
    'drawable-port-hdpi': 72,
    'drawable-port-xhdpi': 96,
    'drawable-port-xxhdpi': 144,
    'drawable-port-xxxhdpi': 192,
    'drawable-port-night-ldpi': 32,
    'drawable-port-night-mdpi': 48,
    'drawable-port-night-hdpi': 72,
    'drawable-port-night-xhdpi': 96,
    'drawable-port-night-xxhdpi': 144,
    'drawable-port-night-xxxhdpi': 192,
}

def replace_android_icon(source_image_path):
    """Remplace toutes les icônes Android"""
    
    if not os.path.exists(source_image_path):
        print(f"❌ Erreur: Le fichier {source_image_path} n'existe pas")
        sys.exit(1)
    
    # Charger l'image source
    try:
        img = Image.open(source_image_path).convert('RGBA')
        print(f"✅ Image source chargée: {source_image_path}")
    except Exception as e:
        print(f"❌ Erreur lors du chargement de l'image: {e}")
        sys.exit(1)
    
    base_path = "android/app/src/main/res"
    
    # Traiter les résolutions mipmap (icônes app)
    print("\n📱 Traitement des icônes mipmap...")
    for dirname, size in RESOLUTIONS.items():
        dir_path = os.path.join(base_path, dirname)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
        
        # Redimensionner l'image
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(dir_path, 'ic_launcher.png')
        resized.save(output_path, 'PNG', quality=95)
        print(f"  ✅ {dirname}/ic_launcher.png ({size}x{size})")
        
        # Icône arrondie
        output_path_round = os.path.join(dir_path, 'ic_launcher_round.png')
        resized.save(output_path_round, 'PNG', quality=95)
        print(f"  ✅ {dirname}/ic_launcher_round.png ({size}x{size})")
    
    print("\n🎨 Traitement des résolutions landscape...")
    for dirname, size in LANDSCAPE_RESOLUTIONS.items():
        dir_path = os.path.join(base_path, dirname)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
        
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(dir_path, 'ic_launcher.png')
        resized.save(output_path, 'PNG', quality=95)
        print(f"  ✅ {dirname}/ic_launcher.png ({size}x{size})")
    
    print("\n🎨 Traitement des résolutions portrait...")
    for dirname, size in PORTRAIT_RESOLUTIONS.items():
        dir_path = os.path.join(base_path, dirname)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
        
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(dir_path, 'ic_launcher.png')
        resized.save(output_path, 'PNG', quality=95)
        print(f"  ✅ {dirname}/ic_launcher.png ({size}x{size})")
    
    print("\n✨ Toutes les icônes Android ont été remplacées avec succès!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python replace_android_icon.py <path_to_source_image>")
        print("Exemple: python replace_android_icon.py assets/icon.png")
        sys.exit(1)
    
    source_image = sys.argv[1]
    replace_android_icon(source_image)
