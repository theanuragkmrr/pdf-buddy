package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Best-effort PDF -> Excel conversion: clusters extracted text fragments into
 * rows (by Y proximity) and columns (by X gaps) per page, one sheet per page.
 * There's no real table/border detection here — it's a layout guess, same
 * spirit as PdfToWordService's plain-text approach.
 */
@Service
public class PdfToExcelService {

    private static final float ROW_TOLERANCE = 3f;
    private static final float COLUMN_GAP_THRESHOLD = 10f;

    private record Fragment(float x, float y, float width, String text) {
    }

    public byte[] convertToXlsx(MultipartFile file) {
        try (PDDocument doc = Loader.loadPDF(file.getBytes());
             XSSFWorkbook workbook = new XSSFWorkbook()) {

            int totalPages = doc.getNumberOfPages();
            for (int i = 1; i <= totalPages; i++) {
                List<Fragment> fragments = new ArrayList<>();

                PDFTextStripper stripper = new PDFTextStripper() {
                    @Override
                    protected void writeString(String string, List<TextPosition> textPositions) {
                        if (string.isBlank() || textPositions.isEmpty()) return;
                        TextPosition first = textPositions.get(0);
                        float width = 0f;
                        for (TextPosition tp : textPositions) {
                            width += tp.getWidthDirAdj();
                        }
                        fragments.add(new Fragment(first.getXDirAdj(), first.getYDirAdj(), width, string.trim()));
                    }
                };
                stripper.setSortByPosition(true);
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                stripper.getText(doc);

                Sheet sheet = workbook.createSheet("Page " + i);
                writeFragmentsToSheet(fragments, sheet);
            }

            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                workbook.write(out);
                return out.toByteArray();
            }
        } catch (IOException e) {
            throw new PdfProcessingException("Could not convert PDF to Excel: " + e.getMessage(), e);
        }
    }

    private void writeFragmentsToSheet(List<Fragment> fragments, Sheet sheet) {
        int rowIndex = 0;
        List<Fragment> currentRow = new ArrayList<>();
        Float currentY = null;

        for (Fragment fragment : fragments) {
            if (currentY == null || Math.abs(fragment.y() - currentY) > ROW_TOLERANCE) {
                if (!currentRow.isEmpty()) {
                    writeRow(sheet, rowIndex++, currentRow);
                    currentRow = new ArrayList<>();
                }
                currentY = fragment.y();
            }
            currentRow.add(fragment);
        }
        if (!currentRow.isEmpty()) {
            writeRow(sheet, rowIndex, currentRow);
        }
    }

    private void writeRow(Sheet sheet, int rowIndex, List<Fragment> fragments) {
        Row row = sheet.createRow(rowIndex);
        int colIndex = 0;
        StringBuilder cellText = new StringBuilder();
        Float lastEndX = null;

        for (Fragment fragment : fragments) {
            if (lastEndX != null && fragment.x() - lastEndX > COLUMN_GAP_THRESHOLD) {
                flushCell(row, colIndex++, cellText);
            } else if (!cellText.isEmpty()) {
                cellText.append(' ');
            }
            cellText.append(fragment.text());
            lastEndX = fragment.x() + fragment.width();
        }
        flushCell(row, colIndex, cellText);
    }

    private void flushCell(Row row, int colIndex, StringBuilder cellText) {
        if (cellText.isEmpty()) return;
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(cellText.toString());
        cellText.setLength(0);
    }
}
