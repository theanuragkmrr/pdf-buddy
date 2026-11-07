package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class UnlockService {

    public byte[] unlock(MultipartFile file, String password) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes(), password == null ? "" : password)) {
            doc.setAllSecurityToBeRemoved(true);
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                doc.save(out);
                return out.toByteArray();
            }
        } catch (InvalidPasswordException e) {
            throw new PdfProcessingException("Incorrect password for this PDF.", e);
        } catch (IOException e) {
            throw new PdfProcessingException("Could not unlock PDF: " + e.getMessage(), e);
        }
    }
}
