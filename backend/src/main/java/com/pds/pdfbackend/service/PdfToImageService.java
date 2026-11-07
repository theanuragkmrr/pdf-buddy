package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class PdfToImageService {

    public byte[] toImagesZip(MultipartFile file, String format, int dpi) {
        String imageFormat = (format == null || format.isBlank()) ? "png" : format.toLowerCase();
        if (!imageFormat.equals("png") && !imageFormat.equals("jpg") && !imageFormat.equals("jpeg")) {
            throw new PdfProcessingException("Unsupported image format: " + format);
        }
        int resolution = dpi <= 0 ? 150 : Math.min(dpi, 600);

        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFRenderer renderer = new PDFRenderer(doc);
            try (ByteArrayOutputStream zipBytes = new ByteArrayOutputStream();
                 ZipOutputStream zos = new ZipOutputStream(zipBytes)) {
                for (int i = 0; i < doc.getNumberOfPages(); i++) {
                    BufferedImage image = renderer.renderImageWithDPI(i, resolution,
                            imageFormat.equals("png") ? ImageType.ARGB : ImageType.RGB);
                    ByteArrayOutputStream imgBytes = new ByteArrayOutputStream();
                    ImageIO.write(image, imageFormat, imgBytes);

                    zos.putNextEntry(new ZipEntry("page_" + (i + 1) + "." + imageFormat));
                    zos.write(imgBytes.toByteArray());
                    zos.closeEntry();
                }
                zos.finish();
                return zipBytes.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not convert PDF to images: " + e.getMessage(), e);
        }
    }
}
