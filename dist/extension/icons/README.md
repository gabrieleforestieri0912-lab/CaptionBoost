# 🎨 Icone per l'Estensione Subverse

Questa cartella contiene le icone per l'estensione Chrome Subverse.

## File Richiesti

- `icon-16.png` - 16x16 pixels (small toolbar icon)
- `icon-48.png` - 48x48 pixels (extension settings)
- `icon-128.png` - 128x128 pixels (Chrome Web Store)

## Generare le Icone

### Opzione 1: Usare Figma (Online, Free)
1. Vai su [figma.com](https://figma.com)
2. Crea un nuovo file
3. Disegna il logo (es: "S" su gradiente azzurro)
4. Esporta come PNG in 16x16, 48x48, 128x128

### Opzione 2: Usare ImageMagick (Command Line)

```bash
# Installa ImageMagick
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: sudo apt install imagemagick

# Crea icone da un'immagine originale (es. 512x512)
convert logo.png -resize 16x16 icon-16.png
convert logo.png -resize 48x48 icon-48.png
convert logo.png -resize 128x128 icon-128.png
```

### Opzione 3: Usare Online Tools

1. [Favicon Generator](https://favicon-generator.org/)
2. [EZGif](https://ezgif.com/)
3. [Logo.com](https://logo.com/)

## Design Consigliato

### Stile
- **Tema**: Bianco/Azzurro (come la landing page)
- **Forma**: Quadrato con bordi arrotondati
- **Icona**: Lettere "S" o simbolo di sottotitoli (💬)

### Colori
```
Azzurro primario: #0066cc
Azzurro scuro: #0052a3
Bianco: #ffffff
Sfondo: Gradiente azzurro
```

### Template SVG

Usa questo SVG come base:

```xml
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066cc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0052a3;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Sfondo -->
  <rect width="512" height="512" fill="url(#grad)" rx="50"/>
  
  <!-- Lettera S -->
  <text x="256" y="360" font-size="280" font-weight="bold" 
        fill="white" text-anchor="middle" font-family="Arial">
    S
  </text>
  
  <!-- Sottotitoli (linee) -->
  <line x1="80" y1="420" x2="432" y2="420" 
        stroke="white" stroke-width="12" opacity="0.7" rx="6"/>
  <line x1="80" y1="470" x2="350" y2="470" 
        stroke="white" stroke-width="12" opacity="0.7" rx="6"/>
</svg>
```

## Convertire SVG a PNG

```bash
# Installa librerie
# npm install -g svg-to-png

# Converti
svg-to-png logo.svg --output=icon-128.png --width=128 --height=128
```

## Posizionamento nell'Estensione

Nel `manifest.json`:

```json
"icons": {
  "16": "/extension/icons/icon-16.png",
  "48": "/extension/icons/icon-48.png",
  "128": "/extension/icons/icon-128.png"
}
```

## Best Practices

1. **Minimalismo** - Le icone piccole (16x16) non possono avere dettagli
2. **Contrasto** - Assicura buona leggibilità sul toolbar di Chrome
3. **Scalabilità** - L'icona deve essere bella a tutte le dimensioni
4. **Coerenza** - Mantieni lo stesso stile della landing page

## Testare le Icone

1. Carica le immagini in `public/extension/icons/`
2. Ricaricare l'estensione in `chrome://extensions/`
3. L'icona dovrebbe apparire nel toolbar di Chrome

---

**Hai bisogno di icone pre-fatte?**

Scarica icone professionali:
- [FlatIcon](https://www.flaticon.com/) (cerca "subtitles")
- [FontAwesome](https://fontawesome.com/) (cerca "cc")
- [Material Icons](https://fonts.google.com/icons/) (cerca "subtitles")

Assicurati che la licenza sia libera per uso commerciale! 📜
