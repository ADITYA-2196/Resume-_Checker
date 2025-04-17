const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');


const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

//middleware to parse json data
app.use(express.json())
// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to simulate ATS score calculation
function getATSScore(filePath) {
    // Simulate scoring (replace with actual logic in the future)
    return Math.floor(Math.random() * 101); // Random score between 0 and 100
}

// Route to handle resume uploads
app.post('/upload', upload.single('resume'), (req, res) => {
    if (req.file) {
        const filePath = req.file.path;
        const atsScore = getATSScore(filePath);
        res.json({ filePath: filePath, atsScore: atsScore });
    } else {

        res.status(400).json({ error: 'No file uploaded' });
    }
});

async function createResumePDF(resumeData) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    let currentY = height - 50;
    const lineHeight = 20;
    const leftMargin = 50;

    // Helper function to add text to the PDF
    function addText(text, y, options = {}) {
        page.drawText(text, {
            x: leftMargin,
            y: y,
            size: options.size || fontSize,
            font: options.font || font,
            color: options.color || rgb(0, 0, 0),
        });
    }

    // Add Resume Content
    addText(resumeData.name || 'Name', currentY, { size: 24, font: await pdfDoc.embedFont(StandardFonts.HelveticaBold) });
    currentY -= lineHeight + 10;
    addText(resumeData.contact || 'Contact Information', currentY);
    currentY -= lineHeight + 10;

    if (resumeData.experience) {
        addText('Work Experience', currentY, { size: 16, font: await pdfDoc.embedFont(StandardFonts.HelveticaBold) });
        currentY -= lineHeight;
        resumeData.experience.forEach((exp) => {
            addText(exp.title, currentY);
            currentY -= lineHeight;
            addText(exp.company, currentY);
            currentY -= lineHeight;
            addText(exp.description, currentY);
            currentY -= lineHeight;
        });
    }
    if (resumeData.education) {
        addText('Education', currentY, { size: 16, font: await pdfDoc.embedFont(StandardFonts.HelveticaBold) });
        currentY -= lineHeight;
        resumeData.education.forEach((edu) => {
            addText(edu.degree, currentY);
            currentY -= lineHeight;
            addText(edu.school, currentY);
            currentY -= lineHeight;
        });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}


// Route to handle file downloads
app.get('/download', (req, res) => {
    const filename = req.query.filename;
    if (!filename) {
        return res.status(400).send('Filename is required');
    }
    const filePath = path.join(__dirname, 'uploads', filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            }
        });
    } else {
        res.status(404).send('File not found');
    }
});

// Route to create a new resume
app.post('/create-resume', async (req, res) => {
    try {
        const resumeData = req.body;
        if (!resumeData) {
            return res.status(400).json({ error: 'Resume data is required' });
        }
        const pdfBytes = await createResumePDF(resumeData);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        console.error('Error creating resume:', error);
        res.status(500).json({ error: 'Failed to create resume' });
    }
});



// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});