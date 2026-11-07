package com.pds.pdfbackend.service;

import com.pds.pdfbackend.dto.PdfInfoResponse;
import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class PdfInfoService {

    public PdfInfoResponse info(MultipartFile file) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDRectangle box = doc.getPage(0).getMediaBox();
            return new PdfInfoResponse(
                    file.getOriginalFilename(),
                    doc.getNumberOfPages(),
                    file.getSize(),
                    doc.isEncrypted(),
                    box.getWidth(),
                    box.getHeight());
        } catch (IOException e) {
            throw new PdfProcessingException("Could not read PDF: " + e.getMessage(), e);
        }
    }
}
