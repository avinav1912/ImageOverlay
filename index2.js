const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const { console } = require('inspector');

const app = express();
const port = 3011;

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
try {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
} catch (err) {
    if (err.code !== 'EEXIST') throw err;
}

app.post('/api/process', upload.single('userImage'), async (req, res) => {
  try {
    const { productUrl } = req.body;
    const overlayPosition = JSON.parse(req.body.overlayPosition);
    const overlaySize = JSON.parse(req.body.overlaySize);
    const containerSize = JSON.parse(req.body.containerSize);
    const rotation = parseInt(req.body.rotation) || 0;
    const scale = parseFloat(req.body.scale) || 1;
    
    // Validate the input parameters
    if (!productUrl || !overlayPosition || !overlaySize || !req.file || !containerSize) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    console.log('Processing image with parameters:', {
      productUrl,
      overlayPosition,
      overlaySize,
      containerSize
    });

    // Load images in parallel
    /* const [productImage, overlayImage] = await Promise.all([
      Jimp.read(productUrl),
      Jimp.read(req.file.buffer)
    ]);
 */
    // Calculate scaling factors
   /*  const scaleX = productImage.getWidth() / containerSize.width;
    const scaleY = productImage.getHeight() / containerSize.height; */
    
    try {
        productImage = await Jimp.read(productUrl);
        console.log('Product image loaded successfully:', {
          width: productImage.bitmap.width,
          height: productImage.bitmap.height
        });
      } catch (error) {
        console.error('Error loading product image:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to load product image: ' + error.message
        });
      }
  
      try {
        overlayImage = await Jimp.read(req.file.buffer);
        console.log('Overlay image loaded successfully:', {
          width: overlayImage.bitmap.width,
          height: overlayImage.bitmap.height
        });
      } catch (error) {
        console.error('Error loading overlay image:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to load overlay image: ' + error.message
        });
      }
  
      // Calculate scaling factors using bitmap dimensions
      const scaleX = productImage.bitmap.width / containerSize.width;
      const scaleY = productImage.bitmap.height / containerSize.height;
      console.log('scale x: '+scaleX);
      console.log('scale y: '+scaleY);

    let parsedOverlaySize = typeof overlaySize === "string" ? JSON.parse(overlaySize) : overlaySize;
    const overlaySizewidth = parseInt(String(parsedOverlaySize?.width).trim(), 10);
    const overlaySizeheight = parseInt(String(parsedOverlaySize?.height).trim(), 10);

    console.log("overlaySizewidth: "+overlaySizewidth);
        console.log("overlaySizeheight: "+overlaySizeheight);
        if (isNaN(overlaySizewidth) || isNaN(overlaySizeheight)) {
            return res.status(400).json({ success: false, error: "Invalid overlay size" });
        }


        let parsedOverlayPosition = typeof overlayPosition === "string" ? JSON.parse(overlayPosition) : overlayPosition;
        const overlayPositionx = parseInt(String(parsedOverlayPosition?.x).trim(), 10);
        const overlayPositiony = parseInt(String(parsedOverlayPosition?.y).trim(), 10);
        console.log("overlayPositionx: "+overlayPositionx);
        console.log("overlayPositiony: "+overlayPositiony);
        if (isNaN(overlayPositionx) || isNaN(overlayPositiony)) {
            return res.status(400).json({ success: false, error: "Invalid overlay position" });
        }

    // Scale the overlay size and position
    const scaledSize = {
      width: Math.round(overlaySizewidth * scaleX),
      height: Math.round(overlaySizeheight * scaleY)
    };
    console.log("scaledSize: "+scaledSize);
    const scaledPosition = {
      x: Math.round(overlayPositionx * scaleX),
      y: Math.round(overlayPositiony * scaleY)
    };
    console.log("sclaedPositionx: "+scaledPosition.x);
    console.log("sclaedPositiony: "+scaledPosition.y);
    

    // Apply scale transformation
    const finalWidth = Math.round(scaledSize.width * scale);
    const finalHeight = Math.round(scaledSize.height * scale);
    
    // Resize the overlay image
    overlayImage.resize(finalWidth, finalHeight);
    // Apply rotation if needed
    if (rotation !== 0) {
        overlayImage.rotate(rotation);
      }

    // Resize the overlay image
    //overlayImage.resize(scaledSize.width, scaledSize.height);
    
    // Composite the images
    productImage.composite(overlayImage, scaledPosition.x, scaledPosition.y);
    
    // Generate unique filename
    const filename = `processed-${Date.now()}.png`;
    const outputPath = path.join(__dirname, 'uploads', filename);
    
    // Write the file using a Promise wrapper
    await new Promise((resolve, reject) => {
      productImage.write(outputPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Return the URL of the processed image
    res.json({
      success: true,
      processedImageUrl: `/uploads/${filename}`
    });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process image: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});