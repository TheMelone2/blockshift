# Blockshift: A Minecraft Texture Pack Converter (1.21.5)

> [!NOTE]
> This project is not affiliated with Mojang or Microsoft. It is an independent tool created for educational and personal use. I know I'm not the best developer, but I hope this tool is useful to you! Tried to keep it simple and functional and create good documentation.

A browser-based tool to convert old Minecraft texture packs to the 1.21.5 format.  
**No files are uploaded to a server. All conversion is done in your browser.**

## Features

- Updates `pack.mcmeta` to `pack_format: 47`
- Auto-renames known moved textures (see `renameMap.js`)
- Splits classic `terrain.png` into 16×16 blocks (see `nameMap.js`)
- Previews all PNGs found/created
- **Edit textures directly in your browser with a pixel editor (In-Beta)**
- Download the converted or edited pack instantly

## Usage

1. Open `index.html` in your browser.
2. Drag and drop your old texture pack `.zip` or click the dropzone to select a file.
3. Click **Convert to 1.21.5**.
4. Browse and preview all PNGs. Click **Edit** on any PNG to open the pixel editor.
5. Save your edits, or use **Save As New Pack** in the editor to export your changes.

## Development

- All logic is modularized in ES modules (`main.js`, `renameMap.js`, `nameMap.js`, `utils.js`, `pngEditor.js`).
- Styles are in `style.css` and `styles.editor.css`.
- To add new rename rules, edit `renameMap.js`.
- To update the terrain split mapping, edit `nameMap.js`.
- To add new features, create new modules and import them in `main.js`.

## How to Start the Server

This project is a static web app. You need a static file server to run it locally (due to ES module imports).

### Using Node.js and Express

1. Install [Node.js](https://nodejs.org/) if you haven't already.
2. Install dependencies in your project directory:

   ```sh
   npm i
   ```
3. Start the server:

   ```sh
   node server.js
   ```

5. Open your browser and go to [http://localhost:8080](http://localhost:8080).

### Alternative: Using Python (if you have Python 3)

```sh
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## Contributing

- Fork and submit pull requests.
- Please keep code modular and easy to extend.
- See `renameMap.js` and `nameMap.js` for data-driven mappings.
- See `features/main/pngEditor.js` and `styles.editor.css` for the in-browser editor.
## Contributing Guidelines

- **Use clear, descriptive commit messages** that explain the purpose of your changes.
- **Keep code modular and maintainable** - organize logic into ES modules and avoid monolithic files.
- **Follow the existing code style** for formatting, naming, and structure. Consistency helps everyone
Meaning:
  - Use camelCase for variable and function names.
  - Use PascalCase for class names.
  - Use single quotes for strings (unless it contains a single quote).
- **Test your changes thoroughly** before submitting, including edge cases and browser compatibility.
- **Document new features or changes** in the README or relevant files.
- **Submit pull requests with detailed descriptions** outlining what was changed and why.
- **Be respectful and constructive** in code reviews and discussions.

Thank you for helping improve Blockshift!

## License

MIT License

[![Deploy to GitHub Pages](https://github.com/TheMelone2/blockshift/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/TheMelone2/blockshift/actions/workflows/gh-pages.yml)