"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatXml = formatXml;
function formatXml(xml) {
    let formatted = '';
    let indent = 0;
    const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        if (trimmed.startsWith('</')) {
            indent = Math.max(indent - 1, 0);
        }
        formatted += '  '.repeat(indent) + trimmed + '\n';
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') &&
            !trimmed.endsWith('/>') && !trimmed.includes('</')) {
            indent++;
        }
    }
    return formatted;
}
//# sourceMappingURL=xml-builder.js.map