package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Best-effort PDF -> Word conversion: extracts text page-by-page and writes
 * it into a .docx, preserving paragraph breaks and inserting a page break
 * between source pages. Layout/graphics/tables are not reproduced.
 */
@Service
public class PdfToWordService {

    public byte[] convertToDocx(MultipartFile file) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes());
             XWPFDocument docx = new XWPFDocument()) {

            int totalPages = doc.getNumberOfPages();
            for (int i = 1; i <= totalPages; i++) {
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(doc);

                for (String line : pageText.split("\\r?\\n")) {
                    XWPFParagraph paragraph = docx.createParagraph();
                    XWPFRun run = paragraph.createRun();
                    run.setText(line);
                }
                if (i < totalPages) {
                    XWPFParagraph pageBreak = docx.createParagraph();
                    pageBreak.createRun().addBreak(org.apache.poi.xwpf.usermodel.BreakType.PAGE);
                }
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                docx.write(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not convert PDF to Word: " + e.getMessage(), e);
        }
    }
}
