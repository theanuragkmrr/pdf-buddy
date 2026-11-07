package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class WatermarkService {

    public byte[] addWatermark(MultipartFile file, String text, int fontSize, float opacity, String colorHex) {
        if (text == null || text.isBlank()) {
            throw new PdfProcessingException("Watermark text cannot be empty.");
        }
        Color color = parseColor(colorHex);
        float clampedOpacity = Math.max(0.05f, Math.min(1f, opacity));

        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
            gs.setNonStrokingAlphaConstant(clampedOpacity);
            gs.setStrokingAlphaConstant(clampedOpacity);

            for (PDPage page : doc.getPages()) {
                PDRectangle box = page.getMediaBox();
                float textWidth = font.getStringWidth(text) / 1000f * fontSize;
                float centerX = box.getWidth() / 2f;
                float centerY = box.getHeight() / 2f;

                try (PDPageContentStream cs = new PDPageContentStream(
                        doc, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.setGraphicsStateParameters(gs);
                    cs.setNonStrokingColor(color);
                    cs.beginText();
                    cs.setFont(font, fontSize);
                    cs.setTextMatrix(org.apache.pdfbox.util.Matrix.getRotateInstance(
                            Math.toRadians(45), centerX - (float) (textWidth / 2f * Math.cos(Math.toRadians(45))),
                            centerY - (float) (textWidth / 2f * Math.sin(Math.toRadians(45)))));
                    cs.showText(text);
                    cs.endText();
                }
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                doc.save(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not add watermark: " + e.getMessage(), e);
        }
    }

    private Color parseColor(String hex) {
        if (hex == null || hex.isBlank()) {
            return Color.GRAY;
        }
        try {
            String cleaned = hex.startsWith("#") ? hex.substring(1) : hex;
            return new Color(Integer.parseInt(cleaned, 16));
        } catch (NumberFormatException e) {
            return Color.GRAY;
        }
    }
}
