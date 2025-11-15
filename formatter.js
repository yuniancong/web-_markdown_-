/**
 * Markdown Formatter Utility
 * Converts HTML elements to Heptabase-compatible Markdown
 */

const MarkdownFormatter = {
  /**
   * Convert an HTML table to Markdown table format
   * @param {HTMLTableElement} table - The table element to convert
   * @returns {string} Markdown formatted table
   */
  tableToMarkdown(table) {
    if (!table || table.tagName !== 'TABLE') {
      return '';
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    let markdown = '';
    let hasHeader = false;

    // Check if first row contains th elements (header)
    const firstRow = rows[0];
    const firstRowHeaders = firstRow.querySelectorAll('th');
    hasHeader = firstRowHeaders.length > 0;

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      if (cells.length === 0) return;

      // Process each cell
      const cellContents = cells.map(cell => this.cleanCellText(cell.textContent));

      // Create table row
      markdown += '| ' + cellContents.join(' | ') + ' |\n';

      // Add separator line after header
      if (rowIndex === 0 && (hasHeader || rows.length > 1)) {
        const separator = cellContents.map(() => '---').join(' | ');
        markdown += '| ' + separator + ' |\n';
      }
    });

    return markdown + '\n';
  },

  /**
   * Clean cell text for Markdown table
   * @param {string} text - Raw cell text
   * @returns {string} Cleaned text
   */
  cleanCellText(text) {
    return text
      .trim()
      .replace(/\|/g, '\\|')  // Escape pipes
      .replace(/\n/g, ' ')    // Replace newlines with spaces
      .replace(/\s+/g, ' ');  // Collapse multiple spaces
  },

  /**
   * Convert a DOM element to Markdown
   * @param {HTMLElement} element - The element to convert
   * @returns {string} Markdown formatted content
   */
  elementToMarkdown(element) {
    if (!element) return '';

    // Special handling for tables
    if (element.tagName === 'TABLE') {
      return this.tableToMarkdown(element);
    }

    // For other elements, use recursive conversion
    return this.convertNode(element);
  },

  /**
   * Recursively convert a DOM node to Markdown
   * @param {Node} node - The node to convert
   * @param {Object} context - Conversion context
   * @returns {string} Markdown formatted content
   */
  convertNode(node, context = { listDepth: 0, inPre: false }) {
    if (!node) return '';

    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      return context.inPre ? text : text.trim();
    }

    // Non-element nodes
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();
    let markdown = '';

    switch (tag) {
      // Headings
      case 'h1':
        markdown = '\n# ' + this.getTextContent(node) + '\n\n';
        break;
      case 'h2':
        markdown = '\n## ' + this.getTextContent(node) + '\n\n';
        break;
      case 'h3':
        markdown = '\n### ' + this.getTextContent(node) + '\n\n';
        break;
      case 'h4':
        markdown = '\n#### ' + this.getTextContent(node) + '\n\n';
        break;
      case 'h5':
        markdown = '\n##### ' + this.getTextContent(node) + '\n\n';
        break;
      case 'h6':
        markdown = '\n###### ' + this.getTextContent(node) + '\n\n';
        break;

      // Paragraph
      case 'p':
        markdown = this.convertChildren(node, context) + '\n\n';
        break;

      // Line break
      case 'br':
        markdown = '  \n';
        break;

      // Bold
      case 'strong':
      case 'b':
        markdown = '**' + this.getTextContent(node) + '**';
        break;

      // Italic
      case 'em':
      case 'i':
        markdown = '*' + this.getTextContent(node) + '*';
        break;

      // Inline code
      case 'code':
        if (node.parentElement && node.parentElement.tagName === 'PRE') {
          markdown = node.textContent;
        } else {
          markdown = '`' + this.getTextContent(node) + '`';
        }
        break;

      // Code block
      case 'pre':
        const codeNode = node.querySelector('code');
        const codeText = codeNode ? codeNode.textContent : node.textContent;
        const language = codeNode ? this.getCodeLanguage(codeNode) : '';
        markdown = '\n```' + language + '\n' + codeText + '\n```\n\n';
        break;

      // Link
      case 'a':
        const href = node.getAttribute('href') || '';
        const linkText = this.getTextContent(node);
        markdown = '[' + linkText + '](' + href + ')';
        break;

      // Image
      case 'img':
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        markdown = '![' + alt + '](' + src + ')';
        break;

      // Lists
      case 'ul':
      case 'ol':
        markdown = '\n' + this.convertList(node, tag, context.listDepth) + '\n';
        break;

      // List item (handled by convertList)
      case 'li':
        markdown = this.convertChildren(node, context);
        break;

      // Table
      case 'table':
        markdown = '\n' + this.tableToMarkdown(node) + '\n';
        break;

      // Blockquote
      case 'blockquote':
        const quoteLines = this.getTextContent(node).split('\n');
        markdown = '\n' + quoteLines.map(line => '> ' + line.trim()).join('\n') + '\n\n';
        break;

      // Horizontal rule
      case 'hr':
        markdown = '\n---\n\n';
        break;

      // Division and span - process children
      case 'div':
      case 'span':
      case 'section':
      case 'article':
      case 'main':
        markdown = this.convertChildren(node, context);
        if (tag === 'div' || tag === 'section' || tag === 'article') {
          markdown += '\n';
        }
        break;

      // Skip script, style, and other non-content elements
      case 'script':
      case 'style':
      case 'noscript':
        markdown = '';
        break;

      // Default: process children
      default:
        markdown = this.convertChildren(node, context);
        break;
    }

    return markdown;
  },

  /**
   * Convert child nodes to Markdown
   */
  convertChildren(node, context) {
    return Array.from(node.childNodes)
      .map(child => this.convertNode(child, context))
      .join('');
  },

  /**
   * Convert a list to Markdown
   */
  convertList(listNode, listType, depth) {
    const items = Array.from(listNode.children).filter(child => child.tagName === 'LI');
    const indent = '  '.repeat(depth);

    return items.map((li, index) => {
      const bullet = listType === 'ul' ? '-' : `${index + 1}.`;
      const content = this.getTextContent(li);
      return indent + bullet + ' ' + content;
    }).join('\n');
  },

  /**
   * Get text content of a node
   */
  getTextContent(node) {
    return node.textContent.trim().replace(/\s+/g, ' ');
  },

  /**
   * Get code language from class name
   */
  getCodeLanguage(codeNode) {
    const className = codeNode.className;
    const match = className.match(/language-(\w+)/);
    return match ? match[1] : '';
  },

  /**
   * Clean up markdown formatting
   */
  cleanMarkdown(markdown) {
    return markdown
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
      .replace(/^\n+/, '')          // Remove leading newlines
      .replace(/\n+$/, '\n')        // Single trailing newline
      .trim();
  },

  /**
   * Main conversion method
   */
  convert(element) {
    const markdown = this.elementToMarkdown(element);
    return this.cleanMarkdown(markdown);
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownFormatter;
}
