/**
 * Image Preprocessor for OCR
 *
 * Applies image preprocessing techniques to improve OCR accuracy:
 * - Grayscale conversion
 * - Contrast enhancement
 * - Adaptive thresholding (binarization)
 *
 * Uses Canvas API for browser-based image manipulation.
 */

/**
 * @typedef {Object} PreprocessOptions
 * @property {boolean} [grayscale=true] - Convert to grayscale
 * @property {boolean} [enhanceContrast=true] - Apply contrast enhancement
 * @property {boolean} [binarize=false] - Apply adaptive thresholding (aggressive, may lose detail)
 * @property {number} [contrastFactor=1.3] - Contrast multiplier (1.0 = no change)
 * @property {number} [brightnessDelta=10] - Brightness adjustment (-255 to 255)
 */

/** @type {PreprocessOptions} */
const DEFAULT_OPTIONS = {
  grayscale: true,
  enhanceContrast: true,
  binarize: false,
  contrastFactor: 1.3,
  brightnessDelta: 10,
};

/**
 * Load an image blob into an ImageBitmap for processing
 * @param {Blob} blob - Image blob to load
 * @returns {Promise<ImageBitmap>}
 */
async function loadImage(blob) {
  return createImageBitmap(blob);
}

/**
 * Convert ImageData to grayscale using luminance formula
 * @param {ImageData} imageData - Image data to convert
 */
function applyGrayscale(imageData) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Luminance formula: 0.299*R + 0.587*G + 0.114*B
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha channel (data[i + 3]) remains unchanged
  }
}

/**
 * Apply contrast and brightness adjustment
 * Formula: newValue = contrastFactor * (value - 128) + 128 + brightnessDelta
 * @param {ImageData} imageData - Image data to adjust
 * @param {number} contrastFactor - Contrast multiplier (>1 increases, <1 decreases)
 * @param {number} brightnessDelta - Brightness offset
 */
function applyContrastBrightness(imageData, contrastFactor, brightnessDelta) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const idx = i + c;
      let value = data[idx];
      // Apply contrast around midpoint (128)
      value = contrastFactor * (value - 128) + 128 + brightnessDelta;
      // Clamp to valid range
      data[idx] = Math.max(0, Math.min(255, value));
    }
  }
}

/**
 * Apply simple global thresholding (Otsu-like approach)
 * Converts image to pure black and white based on calculated threshold
 * @param {ImageData} imageData - Image data to binarize (should already be grayscale)
 */
function applyBinarization(imageData) {
  const data = imageData.data;

  // Calculate histogram
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }

  // Calculate Otsu's threshold
  const totalPixels = data.length / 4;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) {
      continue;
    }

    const wF = totalPixels - wB;
    if (wF === 0) {
      break;
    }

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  // Apply threshold
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
}

/**
 * Preprocess an image blob for better OCR results
 * @param {Blob} imageBlob - Original image blob
 * @param {Partial<PreprocessOptions>} [options] - Preprocessing options
 * @returns {Promise<Blob>} Preprocessed image blob
 */
export async function preprocessImage(imageBlob, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load image
  const imageBitmap = await loadImage(imageBlob);

  try {
    // Create canvas with image dimensions
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw original image
    ctx.drawImage(imageBitmap, 0, 0);

    // Get image data for manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply preprocessing steps in order
    if (opts.grayscale) {
      applyGrayscale(imageData);
    }

    if (opts.enhanceContrast) {
      applyContrastBrightness(imageData, opts.contrastFactor, opts.brightnessDelta);
    }

    if (opts.binarize) {
      // Note: binarization works best on grayscale images
      if (!opts.grayscale) {
        applyGrayscale(imageData);
      }
      applyBinarization(imageData);
    }

    // Put processed data back
    ctx.putImageData(imageData, 0, 0);

    // Convert to blob (use PNG for lossless quality after processing)
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png'
      );
    });
  } finally {
    // Release ImageBitmap memory to prevent memory leaks
    imageBitmap.close();
  }
}

/**
 * Preprocess options optimized for printed/electronic scoresheets
 * Minimal processing - electronic sheets are already high contrast
 * Over-processing can degrade quality on clean printed text
 * @type {PreprocessOptions}
 */
export const ELECTRONIC_PRESET = {
  grayscale: false,
  enhanceContrast: false,
  binarize: false,
  contrastFactor: 1.0,
  brightnessDelta: 0,
};

/**
 * Preprocess options optimized for handwritten scoresheets
 * More aggressive processing to handle varying ink quality
 * @type {PreprocessOptions}
 */
export const HANDWRITTEN_PRESET = {
  grayscale: true,
  enhanceContrast: true,
  binarize: true,
  contrastFactor: 1.5,
  brightnessDelta: 20,
};
