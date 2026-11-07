package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ImageToPdfService {

    public byte[] convert(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new PdfProcessingException("Please upload at least one image.");
        }
        try (PDDocument doc = new PDDocument()) {
            for (MultipartFile file : files) {
                BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
                if (bufferedImage == null) {
                    throw new PdfProcessingException("'" + file.getOriginalFilename() + "' is not a valid image.");
                }
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, file.getBytes(), file.getOriginalFilename());

                float imgWidth = bufferedImage.getWidth();
                float imgHeight = bufferedImage.getHeight();
                PDRectangle pageSize = (imgWidth > imgHeight)
                        ? new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth())
                        : PDRectangle.A4;

                PDPage page = new PDPage(pageSize);
                doc.addPage(page);

                float scale = Math.min(pageSize.getWidth() / imgWidth, pageSize.getHeight() / imgHeight);
                float drawWidth = imgWidth * scale;
                float drawHeight = imgHeight * scale;
                float x = (pageSize.getWidth() - drawWidth) / 2f;
                float y = (pageSize.getHeight() - drawHeight) / 2f;

                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.drawImage(pdImage, x, y, drawWidth, drawHeight);
                }
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                doc.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not convert images to PDF: " + e.getMessage(), e);
        }
    }
}
