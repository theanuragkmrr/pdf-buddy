package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import com.pds.pdfbackend.service.util.PageRangeParser;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;

@Service
public class RotateService {

    public byte[] rotate(MultipartFile file, int angle, String pagesSpec) {
        if (angle % 90 != 0) {
            throw new PdfProcessingException("Rotation angle must be a multiple of 90 degrees.");
        }
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            int totalPages = doc.getNumberOfPages();
            Set<Integer> targetPages = (pagesSpec == null || pagesSpec.isBlank())
                    ? null
                    : PageRangeParser.parse(pagesSpec, totalPages);

            for (int i = 0; i < totalPages; i++) {
                if (targetPages == null || targetPages.contains(i + 1)) {
                    PDPage page = doc.getPage(i);
                    int newRotation = (page.getRotation() + angle) % 360;
                    page.setRotation(newRotation < 0 ? newRotation + 360 : newRotation);
                }
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                doc.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not rotate PDF: " + e.getMessage(), e);
        }
    }
}
