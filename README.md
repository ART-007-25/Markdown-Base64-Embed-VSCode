# Markdown Base64 Image Embed

A Visual Studio Code extension that takes dropped or pasted image data and embeds it into a Markdown file as Base64.  
Since the image is contained directly in the file, there is no need to bundle external image files when sending a Markdown file to someone.  

I made this extension to calm my OCD that would cause me to manually convert image files to WebP and then B64 when doing my stats homework.  

## Compilation

Clone and navigate into the repository using  
```
git clone https://github.com/ART-007-25/Markdown-Base64-Embed-VSCode
cd ./Markdown-Base64-Embed-VSCode
```
Install dependencies and compile the TypeScript using
```
npm install
npm run compile
```
Finally, create the VSIX extension file using
```
npx @vscode/vsce package
```
You can now install the VSIX manually in Visual Studio Code (or forks/related programs such as VSCodium).