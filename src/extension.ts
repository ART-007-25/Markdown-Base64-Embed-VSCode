import * as vscode from 'vscode';
import sharp from 'sharp';

const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml'
];

/**
 * Retrieves configuration values.
 */
function getConfig() {
  const config = vscode.workspace.getConfiguration('markdownBase64Embed');
  return {
    targetFormat: config.get<string>('targetFormat', 'preserve'),
    quality: config.get<number>('quality', 80),
    defaultAltText: config.get<string>('defaultAltText', 'Embedded Image')
  };
}

/**
 * Processes an input image buffer based on user conversion preferences.
 */
async function processImage(
  buffer: Buffer,
  sourceMime: string,
  targetFormat: string,
  quality: number
): Promise<{ data: Buffer; mime: string }> {
  // If set to preserve, or if the source is SVG (vector), avoid raster conversion.
  if (targetFormat === 'preserve' || sourceMime === 'image/svg+xml') {
    return { data: buffer, mime: sourceMime };
  }

  const image = sharp(buffer);

  switch (targetFormat) {
    case 'webp': {
      const outputBuffer = await image.webp({ quality }).toBuffer();
      return { data: outputBuffer, mime: 'image/webp' };
    }
    case 'jpeg': {
      const outputBuffer = await image.jpeg({ quality }).toBuffer();
      return { data: outputBuffer, mime: 'image/jpeg' };
    }
    case 'png': {
      const outputBuffer = await image.png().toBuffer();
      return { data: outputBuffer, mime: 'image/png' };
    }
    default:
      return { data: buffer, mime: sourceMime };
  }
}

/**
 * Extracts image data from a DataTransfer object and produces the Markdown snippet.
 */
async function createBase64MarkdownSnippet(
  dataTransfer: vscode.DataTransfer,
  token: vscode.CancellationToken
): Promise<vscode.SnippetString | undefined> {
  const { targetFormat, quality, defaultAltText } = getConfig();

  for (const mimeType of SUPPORTED_MIME_TYPES) {
    const item = dataTransfer.get(mimeType);
    if (!item) {
      continue;
    }

    const rawData = await item.asFile()?.data();
    if (!rawData || token.isCancellationRequested) {
      return undefined;
    }

    const rawBuffer = Buffer.from(rawData);
    const processed = await processImage(rawBuffer, mimeType, targetFormat, quality);

    if (token.isCancellationRequested) {
      return undefined;
    }

    const b64 = processed.data.toString('base64');
    const markdownEmbed = `![${defaultAltText}](data:${processed.mime};base64,${b64})`;

    return new vscode.SnippetString(markdownEmbed);
  }

  return undefined;
}

/**
 * Provider handling paste actions in Markdown documents.
 */
class MarkdownImagePasteProvider implements vscode.DocumentPasteEditProvider {
  static readonly id = 'markdownBase64Embed.pasteProvider';

  async provideDocumentPasteEdits(
    _document: vscode.TextDocument,
    _ranges: readonly vscode.Range[],
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentPasteEdit | undefined> {
    const snippet = await createBase64MarkdownSnippet(dataTransfer, token);
    if (!snippet) {
      return undefined;
    }

    const edit = new vscode.DocumentPasteEdit(
      snippet,
      'Insert as inline Base64 Image',
      MarkdownImagePasteProvider.id
    );

    return edit;
  }
}

/**
 * Provider handling drag-and-drop actions in Markdown documents.
 */
class MarkdownImageDropProvider implements vscode.DocumentDropEditProvider {
  static readonly id = 'markdownBase64Embed.dropProvider';

  async provideDocumentDropEdits(
    _document: vscode.TextDocument,
    _position: vscode.Position,
    dataTransfer: vscode.DataTransfer,
    token: vscode.CancellationToken
  ): Promise<vscode.DocumentDropEdit | undefined> {
    const snippet = await createBase64MarkdownSnippet(dataTransfer, token);
    if (!snippet) {
      return undefined;
    }

    const edit = new vscode.DocumentDropEdit(snippet);
    edit.title = 'Insert as inline Base64 Image';

    return edit;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: 'markdown' };

  // Register Paste Provider
  context.subscriptions.push(
    vscode.languages.registerDocumentPasteEditProvider(
      selector,
      new MarkdownImagePasteProvider(),
      {
        providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
        pasteMimeTypes: SUPPORTED_MIME_TYPES
      }
    )
  );

  // Register Drop Provider
  context.subscriptions.push(
    vscode.languages.registerDocumentDropEditProvider(
      selector,
      new MarkdownImageDropProvider(),
      {
        dropMimeTypes: SUPPORTED_MIME_TYPES
      }
    )
  );
}

export function deactivate() {}