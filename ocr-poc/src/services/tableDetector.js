/**
 * Table Detector for Scoresheet OCR
 *
 * Detects table structure in scoresheet images by finding:
 * - Horizontal and vertical lines
 * - Table boundaries
 * - Column regions
 *
 * Uses edge detection and line analysis on Canvas.
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} x - Left position
 * @property {number} y - Top position
 * @property {number} width - Width
 * @property {number} height - Height
 */

/**
 * @typedef {Object} TableRegions
 * @property {BoundingBox} table - Full table bounding box
 * @property {BoundingBox[]} columns - Individual column regions
 * @property {BoundingBox[]} rows - Individual row regions
 */

/**
 * Minimum line length as percentage of image dimension
 */
const MIN_LINE_LENGTH_PERCENT = 0.15;

/**
 * Threshold for edge detection (0-255)
 */
const EDGE_THRESHOLD = 30;

/**
 * Load image blob into ImageBitmap
 * @param {Blob} blob
 * @returns {Promise<ImageBitmap>}
 */
async function loadImage(blob) {
  return createImageBitmap(blob);
}

/**
 * Convert image to grayscale pixel array
 * @param {ImageData} imageData
 * @returns {Uint8Array} Grayscale values (0-255)
 */
function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);

  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    // Luminance formula
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }

  return gray;
}

/**
 * Apply Sobel edge detection
 * @param {Uint8Array} gray - Grayscale image
 * @param {number} width
 * @param {number} height
 * @returns {{ horizontal: Uint8Array, vertical: Uint8Array }}
 */
function sobelEdgeDetection(gray, width, height) {
  const horizontal = new Uint8Array(width * height);
  const vertical = new Uint8Array(width * height);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }

      const pixelIdx = y * width + x;
      horizontal[pixelIdx] = Math.min(255, Math.abs(gy));
      vertical[pixelIdx] = Math.min(255, Math.abs(gx));
    }
  }

  return { horizontal, vertical };
}

/**
 * Find horizontal lines using projection profile
 * @param {Uint8Array} edges - Edge image
 * @param {number} width
 * @param {number} height
 * @returns {number[]} Y positions of horizontal lines
 */
function findHorizontalLines(edges, width, height) {
  const projection = new Uint32Array(height);
  const minLength = Math.floor(width * MIN_LINE_LENGTH_PERCENT);

  // Sum edge values for each row
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > EDGE_THRESHOLD) {
        count++;
      }
    }
    projection[y] = count;
  }

  // Find peaks (rows with many edge pixels)
  const lines = [];
  for (let y = 0; y < height; y++) {
    if (projection[y] > minLength) {
      // Check if this is a local maximum
      const prev = y > 0 ? projection[y - 1] : 0;
      const next = y < height - 1 ? projection[y + 1] : 0;
      if (projection[y] >= prev && projection[y] >= next) {
        lines.push(y);
      }
    }
  }

  // Merge nearby lines (within 5 pixels)
  const mergedLines = [];
  let lastLine = -10;
  for (const line of lines) {
    if (line - lastLine > 5) {
      mergedLines.push(line);
      lastLine = line;
    }
  }

  return mergedLines;
}

/**
 * Find vertical lines using projection profile
 * @param {Uint8Array} edges - Edge image
 * @param {number} width
 * @param {number} height
 * @returns {number[]} X positions of vertical lines
 */
function findVerticalLines(edges, width, height) {
  const projection = new Uint32Array(width);
  const minLength = Math.floor(height * MIN_LINE_LENGTH_PERCENT);

  // Sum edge values for each column
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < height; y++) {
      if (edges[y * width + x] > EDGE_THRESHOLD) {
        count++;
      }
    }
    projection[x] = count;
  }

  // Find peaks (columns with many edge pixels)
  const lines = [];
  for (let x = 0; x < width; x++) {
    if (projection[x] > minLength) {
      const prev = x > 0 ? projection[x - 1] : 0;
      const next = x < width - 1 ? projection[x + 1] : 0;
      if (projection[x] >= prev && projection[x] >= next) {
        lines.push(x);
      }
    }
  }

  // Merge nearby lines (within 5 pixels)
  const mergedLines = [];
  let lastLine = -10;
  for (const line of lines) {
    if (line - lastLine > 5) {
      mergedLines.push(line);
      lastLine = line;
    }
  }

  return mergedLines;
}

/**
 * Detect table structure in an image
 * @param {Blob} imageBlob - Image to analyze
 * @returns {Promise<TableRegions | null>} Detected regions or null if no table found
 */
export async function detectTableRegions(imageBlob) {
  const imageBitmap = await loadImage(imageBlob);

  try {
    const { width, height } = imageBitmap;

    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);

    // Convert to grayscale
    const gray = toGrayscale(imageData);

    // Detect edges
    const { horizontal, vertical } = sobelEdgeDetection(gray, width, height);

    // Find lines
    const hLines = findHorizontalLines(horizontal, width, height);
    const vLines = findVerticalLines(vertical, width, height);

    // Need at least 2 horizontal and 2 vertical lines for a table
    if (hLines.length < 2 || vLines.length < 2) {
      return null;
    }

    // Calculate table bounds
    const tableTop = hLines[0];
    const tableBottom = hLines[hLines.length - 1];
    const tableLeft = vLines[0];
    const tableRight = vLines[vLines.length - 1];

    // Build column regions
    const columns = [];
    for (let i = 0; i < vLines.length - 1; i++) {
      columns.push({
        x: vLines[i],
        y: tableTop,
        width: vLines[i + 1] - vLines[i],
        height: tableBottom - tableTop,
      });
    }

    // Build row regions
    const rows = [];
    for (let i = 0; i < hLines.length - 1; i++) {
      rows.push({
        x: tableLeft,
        y: hLines[i],
        width: tableRight - tableLeft,
        height: hLines[i + 1] - hLines[i],
      });
    }

    return {
      table: {
        x: tableLeft,
        y: tableTop,
        width: tableRight - tableLeft,
        height: tableBottom - tableTop,
      },
      columns,
      rows,
    };
  } finally {
    imageBitmap.close();
  }
}

/**
 * Crop an image to a specific region
 * @param {Blob} imageBlob - Source image
 * @param {BoundingBox} region - Region to crop
 * @param {number} [padding=5] - Padding around the region
 * @returns {Promise<Blob>} Cropped image
 */
export async function cropToRegion(imageBlob, region, padding = 5) {
  const imageBitmap = await loadImage(imageBlob);

  try {
    const canvas = document.createElement('canvas');

    // Add padding but stay within bounds
    const x = Math.max(0, region.x - padding);
    const y = Math.max(0, region.y - padding);
    const right = Math.min(imageBitmap.width, region.x + region.width + padding);
    const bottom = Math.min(imageBitmap.height, region.y + region.height + padding);

    canvas.width = right - x;
    canvas.height = bottom - y;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cropped region
    ctx.drawImage(
      imageBitmap,
      x,
      y,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png'
      );
    });
  } finally {
    imageBitmap.close();
  }
}

/**
 * Crop image to the detected table region only
 * @param {Blob} imageBlob - Source image
 * @returns {Promise<{ croppedImage: Blob, regions: TableRegions } | null>}
 */
/** Padding around detected table region (pixels) */
const TABLE_CROP_PADDING = 30;

export async function cropToTable(imageBlob) {
  const regions = await detectTableRegions(imageBlob);

  if (!regions) {
    return null;
  }

  const croppedImage = await cropToRegion(imageBlob, regions.table, TABLE_CROP_PADDING);

  // Adjust column/row coordinates relative to cropped image
  const offsetX = regions.table.x - TABLE_CROP_PADDING;
  const offsetY = regions.table.y - TABLE_CROP_PADDING;

  const adjustedColumns = regions.columns.map((col) => ({
    ...col,
    x: col.x - offsetX,
    y: col.y - offsetY,
  }));

  const adjustedRows = regions.rows.map((row) => ({
    ...row,
    x: row.x - offsetX,
    y: row.y - offsetY,
  }));

  return {
    croppedImage,
    regions: {
      table: {
        x: TABLE_CROP_PADDING,
        y: TABLE_CROP_PADDING,
        width: regions.table.width,
        height: regions.table.height,
      },
      columns: adjustedColumns,
      rows: adjustedRows,
    },
  };
}
