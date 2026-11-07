package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Lossy compression: re-encodes embedded raster images at a lower resolution
 * and JPEG quality. Vector/text content is left untouched.
 */
@Service
public class CompressService {

    public enum Level {
        LOW(0.8f, 0.75f),
        MEDIUM(0.6f, 0.5f),
        HIGH(0.4f, 0.3f);

        final float scale;
        final float jpegQuality;

        Level(float scale, float jpegQuality) {
            this.scale = scale;
            this.jpegQuality = jpegQuality;
        }
    }

    public byte[] compress(MultipartFile file, String levelName) {
        Level level = parseLevel(levelName);
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            for (PDPage page : doc.getPages()) {
                compressPageImages(doc, page.getResources(), level);
            }
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                doc.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not compress PDF: " + e.getMessage(), e);
        }
    }

    private void compressPageImages(PDDocument doc, PDResources resources, Level level) throws IOException {
        if (resources == null) {
            return;
        }
        Iterator<COSName> names = resources.getXObjectNames().iterator();
        while (names.hasNext()) {
            COSName name = names.next();
            var xobject = resources.getXObject(name);
            if (xobject instanceof PDImageXObject image) {
                BufferedImage original = image.getImage();
                int newWidth = Math.max(1, (int) (original.getWidth() * level.scale));
                int newHeight = Math.max(1, (int) (original.getHeight() * level.scale));

                BufferedImage resized = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = resized.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.drawImage(original, 0, 0, newWidth, newHeight, null);
                g.dispose();

                byte[] jpegBytes = toJpegBytes(resized, level.jpegQuality);
                PDImageXObject compressed = PDImageXObject.createFromByteArray(doc, jpegBytes, name.getName());
                resources.put(name, compressed);
            }
        }
    }

    private byte[] toJpegBytes(BufferedImage image, float quality) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            try (MemoryCacheImageOutputStream mcios = new MemoryCacheImageOutputStream(out)) {
                writer.setOutput(mcios);
                writer.write(null, new IIOImage(image, null, null), param);
            } finally {
                writer.dispose();
            }
            return out.toByteArray();
        }
    }

    private Level parseLevel(String levelName) {
        if (levelName == null || levelName.isBlank()) {
            return Level.MEDIUM;
        }
        try {
            return Level.valueOf(levelName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new PdfProcessingException("Unknown compression level: " + levelName);
        }
    }
}
