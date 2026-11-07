package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Best-effort Word -> PDF conversion: lays out each paragraph's text with
 * simple word-wrapping. Images, tables and rich formatting are not
 * reproduced.
 */
@Service
public class WordToPdfService {

    private static final float FONT_SIZE = 11f;
    private static final float LEADING = 15f;
    private static final float MARGIN = 50f;

    public byte[] convertToPdf(MultipartFile file) {
        try (XWPFDocument docx = new XWPFDocument(file.getInputStream());
             PDDocument pdf = new PDDocument()) {

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDRectangle pageSize = PDRectangle.A4;
            float maxTextWidth = pageSize.getWidth() - 2 * MARGIN;

            PDPage page = new PDPage(pageSize);
            pdf.addPage(page);
            PDPageContentStream cs = new PDPageContentStream(pdf, page);
            cs.beginText();
            cs.setFont(font, FONT_SIZE);
            cs.newLineAtOffset(MARGIN, pageSize.getHeight() - MARGIN);

            float cursorY = pageSize.getHeight() - MARGIN;

            for (XWPFParagraph paragraph : docx.getParagraphs()) {
                String text = paragraph.getText();
                List<String> lines = wrapText(text.isBlank() ? " " : text, font, FONT_SIZE, maxTextWidth);
                for (String line : lines) {
                    if (cursorY <= MARGIN) {
                        cs.endText();
                        cs.close();
                        page = new PDPage(pageSize);
                        pdf.addPage(page);
                        cs = new PDPageContentStream(pdf, page);
                        cs.beginText();
                        cs.setFont(font, FONT_SIZE);
                        cursorY = pageSize.getHeight() - MARGIN;
                        cs.newLineAtOffset(MARGIN, cursorY);
                    } else {
                        cs.newLineAtOffset(0, -LEADING);
                    }
                    cs.showText(line);
                    cursorY -= LEADING;
                }
            }
            cs.endText();
            cs.close();

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                pdf.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not convert Word to PDF: " + e.getMessage(), e);
        }
    }

    private List<String> wrapText(String text, PDType1Font font, float fontSize, float maxWidth) throws IOException {
        List<String> lines = new ArrayList<>();
        for (String paragraphLine : text.split("\\r?\\n")) {
            StringBuilder current = new StringBuilder();
            for (String word : paragraphLine.split(" ")) {
                String candidate = current.isEmpty() ? word : current + " " + word;
                float width = font.getStringWidth(candidate) / 1000f * fontSize;
                if (width > maxWidth && !current.isEmpty()) {
                    lines.add(current.toString());
                    current = new StringBuilder(word);
                } else {
                    current = new StringBuilder(candidate);
                }
            }
            lines.add(current.toString());
        }
        return lines;
    }
}
