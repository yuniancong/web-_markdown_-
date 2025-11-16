/**
 * Image Handler Utility
 * Downloads images and creates packages for Heptabase import
 */

const ImageHandler = {
  /**
   * Extract all image URLs from markdown content
   * @param {string} markdown - Markdown content
   * @returns {Array} Array of image URLs
   */
  extractImageUrls(markdown) {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const urls = [];
    let match;

    while ((match = imageRegex.exec(markdown)) !== null) {
      const alt = match[1];
      const url = match[2];

      // Skip data URLs and SVGs for now (they're already embedded)
      if (!url.startsWith('data:') && !url.endsWith('.svg')) {
        urls.push({ alt, url, original: match[0] });
      }
    }

    return urls;
  },

  /**
   * Convert relative URL to absolute URL
   * @param {string} url - Original URL
   * @param {string} baseUrl - Base URL of the page
   * @returns {string} Absolute URL
   */
  toAbsoluteUrl(url, baseUrl) {
    try {
      // If already absolute, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Convert relative to absolute
      const base = new URL(baseUrl);
      return new URL(url, base).href;
    } catch (error) {
      console.error('Error converting URL:', error);
      return url;
    }
  },

  /**
   * Download image as blob
   * @param {string} url - Image URL
   * @returns {Promise<Blob>} Image blob
   */
  async downloadImage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Error downloading image:', url, error);
      throw error;
    }
  },

  /**
   * Generate unique filename for image
   * @param {string} url - Original URL
   * @param {number} index - Image index
   * @returns {string} Filename
   */
  generateFilename(url, index) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || `image-${index}`;

      // Ensure filename has extension
      if (!filename.includes('.')) {
        return `image-${index}.jpg`;
      }

      // Sanitize filename
      return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    } catch (error) {
      return `image-${index}.jpg`;
    }
  },

  /**
   * Replace image URLs in markdown with local paths
   * @param {string} markdown - Original markdown
   * @param {Array} replacements - Array of {original, newPath}
   * @returns {string} Updated markdown
   */
  replaceImageUrls(markdown, replacements) {
    let updatedMarkdown = markdown;

    replacements.forEach(({ original, newPath }) => {
      updatedMarkdown = updatedMarkdown.replace(original, newPath);
    });

    return updatedMarkdown;
  },

  /**
   * Create a package with markdown and images
   * @param {string} markdown - Markdown content
   * @param {string} pageUrl - Current page URL
   * @param {string} filename - Base filename
   * @returns {Promise<Object>} Package data
   */
  async createPackage(markdown, pageUrl, filename = 'content') {
    // Extract image URLs
    const images = this.extractImageUrls(markdown);

    if (images.length === 0) {
      return {
        markdown,
        images: [],
        hasImages: false
      };
    }

    // Download images and create replacements
    const downloadedImages = [];
    const replacements = [];
    let successCount = 0;

    for (let i = 0; i < images.length; i++) {
      const { alt, url, original } = images[i];

      try {
        // Convert to absolute URL
        const absoluteUrl = this.toAbsoluteUrl(url, pageUrl);

        // Download image
        const blob = await this.downloadImage(absoluteUrl);

        // Generate filename
        const imageFilename = this.generateFilename(absoluteUrl, i);
        const localPath = `./images/${imageFilename}`;

        // Store downloaded image
        downloadedImages.push({
          filename: imageFilename,
          blob: blob,
          alt: alt
        });

        // Create replacement for markdown
        const newMarkdown = `![${alt}](${localPath})`;
        replacements.push({
          original: original,
          newPath: newMarkdown
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to download image ${i}:`, error);
        // Keep original URL if download fails
      }
    }

    // Replace URLs in markdown
    const updatedMarkdown = this.replaceImageUrls(markdown, replacements);

    return {
      markdown: updatedMarkdown,
      images: downloadedImages,
      hasImages: downloadedImages.length > 0,
      totalImages: images.length,
      successCount: successCount
    };
  },

  /**
   * Create ZIP file with markdown and images
   * @param {Object} packageData - Package data from createPackage
   * @param {string} filename - Base filename
   * @returns {Promise<Blob>} ZIP blob
   */
  async createZip(packageData, filename = 'export') {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded');
    }

    const zip = new JSZip();

    // Add markdown file
    zip.file(`${filename}.md`, packageData.markdown);

    // Add README
    const readme = `# Web to Markdown Export

This package was created by Web to Markdown Converter.

## Contents
- ${filename}.md - Main markdown content
- images/ - Downloaded images (${packageData.successCount} files)

## How to use with Heptabase
1. Extract this ZIP file
2. Open the ${filename}.md file in Heptabase
3. Images will be loaded from the images/ folder
4. You can also drag and drop the markdown file directly into Heptabase

Generated on: ${new Date().toISOString()}
`;
    zip.file('README.md', readme);

    // Add images to images folder
    if (packageData.hasImages) {
      const imagesFolder = zip.folder('images');
      packageData.images.forEach(({ filename, blob }) => {
        imagesFolder.file(filename, blob);
      });
    }

    // Generate ZIP
    return await zip.generateAsync({ type: 'blob' });
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageHandler;
}
