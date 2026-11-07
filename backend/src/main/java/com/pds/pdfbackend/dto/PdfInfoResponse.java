package com.pds.pdfbackend.dto;

public record PdfInfoResponse(
        String fileName,
        int pageCount,
        long sizeBytes,
        boolean encrypted,
        float pageWidth,
        float pageHeight
) {
}
