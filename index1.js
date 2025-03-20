const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

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
        const { productUrl, overlayPosition, overlaySize } = req.body;

        const [productImage, overlayImage] = await Promise.all([
            Jimp.read(productUrl),
            Jimp.read(req.file.buffer)
          ]);
        // Resize the overlay image to match the specified dimensions
        console.log("OverlaySize: "+overlaySize);
        console.log("OverlayPosition: "+overlayPosition);
        
        let parsedOverlaySize = typeof overlaySize === "string" ? JSON.parse(overlaySize) : overlaySize;
        const width = parseInt(String(parsedOverlaySize?.width).trim(), 16);
        const height = parseInt(String(parsedOverlaySize?.height).trim(), 16);

        console.log("Width: "+width);
        console.log("Height: "+height);
        if (isNaN(width) || isNaN(height)) {
            return res.status(400).json({ success: false, error: "Invalid overlay size" });
        }

        overlayImage.resize(width, height);


        // Calculate the position for composite

        let parsedOverlayPosition = typeof overlayPosition === "string" ? JSON.parse(overlayPosition) : overlayPosition;
        const x = parseInt(String(parsedOverlayPosition?.x).trim(), 16);
        const y = parseInt(String(parsedOverlayPosition?.y).trim(), 16);
        console.log("X: "+x);
        console.log("Y: "+y);
        if (isNaN(x) || isNaN(y)) {
            return res.status(400).json({ success: false, error: "Invalid overlay position" });
        }

        // Composite the images
        productImage.composite(overlayImage, x, y);


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