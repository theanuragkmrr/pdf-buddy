package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import com.pds.pdfbackend.service.util.PageRangeParser;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;

@Service
public class PageManagementService {

    public byte[] deletePages(MultipartFile file, String pagesSpec) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            int totalPages = doc.getNumberOfPages();
            Set<Integer> toDelete = PageRangeParser.parse(pagesSpec, totalPages);
            if (toDelete.size() >= totalPages) {
                throw new PdfProcessingException("Cannot delete every page in the document.");
            }
            // Remove from the highest index down so earlier indexes stay valid.
            toDelete.stream().sorted((a, b) -> b - a)
                    .forEach(pageNumber -> doc.removePage(pageNumber - 1));

            return save(doc);
        } catch (IOException e) {
            throw new PdfProcessingException("Could not delete pages: " + e.getMessage(), e);
        }
    }

    public byte[] extractPages(MultipartFile file, String pagesSpec) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes());
             PDDocument out = new PDDocument()) {
            int totalPages = doc.getNumberOfPages();
            Set<Integer> toExtract = PageRangeParser.parse(pagesSpec, totalPages);
            for (int pageNumber : toExtract) {
                out.importPage(doc.getPage(pageNumber - 1));
            }
            return save(out);
        } catch (IOException e) {
            throw new PdfProcessingException("Could not extract pages: " + e.getMessage(), e);
        }
    }

    public byte[] addPageNumbers(MultipartFile file, String position, int startNumber) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            int number = startNumber;
            for (PDPage page : doc.getPages()) {
                PDRectangle box = page.getMediaBox();
                String text = String.valueOf(number++);
                float textWidth = font.getStringWidth(text) / 1000f * 10f;

                float x;
                float y = 20f;
                String pos = position == null ? "bottom-center" : position;
                switch (pos) {
                    case "bottom-left" -> x = 20f;
                    case "bottom-right" -> x = box.getWidth() - textWidth - 20f;
                    default -> x = (box.getWidth() - textWidth) / 2f;
                }

                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.beginText();
                    cs.setFont(font, 10f);
                    cs.newLineAtOffset(x, y);
                    cs.showText(text);
                    cs.endText();
                }
            }
            return save(doc);
        } catch (IOException e) {
            throw new PdfProcessingException("Could not add page numbers: " + e.getMessage(), e);
        }
    }

    private byte[] save(PDDocument doc) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.save(out);
            return out.toByteArray();
        }
    }
}
