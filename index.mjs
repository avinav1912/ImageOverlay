import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as Jimp from 'jimp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3011;

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Ensure uploads directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(join(__dirname, 'uploads'), { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') throw err;
}

app.post('/api/process', upload.single('userImage'), async (req, res) => {
  try {
    const { productUrl, overlayPosition, overlaySize } = req.body;
    
    // Load the product image
    const productImage = await Jimp.read(productUrl);
    
    // Load the user's overlay image from the uploaded buffer
    const overlayImage = await Jimp.read(req.file.buffer);
    
    // Resize the overlay image to match the specified dimensions
    overlayImage.resize(parseInt(overlaySize.width), parseInt(overlaySize.height));
    
    // Calculate the position for composite
    const x = parseInt(overlayPosition.x);
    const y = parseInt(overlayPosition.y);
    
    // Composite the images
    productImage.composite(overlayImage, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
      opacityDest: 1
    });
    
    // Generate unique filename
    const filename = `processed-${Date.now()}.png`;
    const outputPath = join(__dirname, 'uploads', filename);
    
    // Save the processed image
    await productImage.writeAsync(outputPath);
    
    // Return the URL of the processed image
    res.json({
      success: true,
      processedImageUrl: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image'
    });
  }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


/* app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); */