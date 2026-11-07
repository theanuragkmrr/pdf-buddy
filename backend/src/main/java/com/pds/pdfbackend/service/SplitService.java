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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Splits a PDF into several single/multi-page PDFs, bundled as a zip.
 * If {@code ranges} is blank, each page becomes its own PDF.
 */
@Service
public class SplitService {

    public byte[] splitToZip(MultipartFile file, String ranges) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            int totalPages = doc.getNumberOfPages();
            List<List<Integer>> groups = new ArrayList<>();

            if (ranges == null || ranges.isBlank()) {
                for (int i = 1; i <= totalPages; i++) {
                    groups.add(List.of(i));
                }
            } else {
                for (String part : ranges.split(";")) {
                    if (part.isBlank()) {
                        continue;
                    }
                    Set<Integer> pages = PageRangeParser.parse(part, totalPages);
                    groups.add(new ArrayList<>(pages));
                }
            }

            if (groups.isEmpty()) {
                throw new PdfProcessingException("No page ranges to split.");
            }

            try (ByteArrayOutputStream zipBytes = new ByteArrayOutputStream();
                 ZipOutputStream zos = new ZipOutputStream(zipBytes)) {
                int fileIndex = 1;
                for (List<Integer> group : groups) {
                    try (PDDocument out = new PDDocument()) {
                        for (int pageNumber : group) {
                            PDPage page = doc.getPage(pageNumber - 1);
                            out.importPage(page);
                        }
                        ByteArrayOutputStream pdfBytes = new ByteArrayOutputStream();
                        out.save(pdfBytes);

                        zos.putNextEntry(new ZipEntry("split_" + fileIndex + ".pdf"));
                        zos.write(pdfBytes.toByteArray());
                        zos.closeEntry();
                        fileIndex++;
                    }
                }
                zos.finish();
                return zipBytes.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not split PDF: " + e.getMessage(), e);
        }
    }
}
