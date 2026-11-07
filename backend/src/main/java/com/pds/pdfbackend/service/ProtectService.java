package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ProtectService {

    public byte[] protect(MultipartFile file, String userPassword, String ownerPassword) {
        if (userPassword == null || userPassword.isBlank()) {
            throw new PdfProcessingException("A password is required to protect the PDF.");
        }
        String owner = (ownerPassword == null || ownerPassword.isBlank())
                ? userPassword + "_owner"
                : ownerPassword;

        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            AccessPermission permission = new AccessPermission();
            StandardProtectionPolicy policy = new StandardProtectionPolicy(owner, userPassword, permission);
            policy.setEncryptionKeyLength(256);
            doc.protect(policy);

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                doc.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not protect PDF: " + e.getMessage(), e);
        }
    }
}
