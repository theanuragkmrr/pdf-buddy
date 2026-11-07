package com.pds.pdfbackend.service.util;

import com.pds.pdfbackend.exception.PdfProcessingException;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.TreeSet;

/**
 * Parses user-facing 1-based page specs like "1,3,5-7" into a sorted set of
 * 1-based page numbers, validated against the document's page count.
 */
public final class PageRangeParser {

    private PageRangeParser() {
    }

    public static Set<Integer> parse(String spec, int totalPages) {
        if (spec == null || spec.isBlank()) {
            throw new PdfProcessingException("Page range cannot be empty.");
        }
        Set<Integer> pages = new TreeSet<>();
        for (String part : spec.split(",")) {
            String token = part.trim();
            if (token.isEmpty()) {
                continue;
            }
            if (token.contains("-")) {
                String[] bounds = token.split("-", 2);
                int start = parsePage(bounds[0], totalPages);
                int end = parsePage(bounds[1], totalPages);
                if (start > end) {
                    throw new PdfProcessingException("Invalid range '" + token + "': start is after end.");
                }
                for (int p = start; p <= end; p++) {
                    pages.add(p);
                }
            } else {
                pages.add(parsePage(token, totalPages));
            }
        }
        if (pages.isEmpty()) {
            throw new PdfProcessingException("No valid pages found in range '" + spec + "'.");
        }
        return pages;
    }

    public static Set<Integer> complement(Set<Integer> pages, int totalPages) {
        Set<Integer> all = new LinkedHashSet<>();
        for (int i = 1; i <= totalPages; i++) {
            if (!pages.contains(i)) {
                all.add(i);
            }
        }
        return all;
    }

    private static int parsePage(String token, int totalPages) {
        int page;
        try {
            page = Integer.parseInt(token.trim());
        } catch (NumberFormatException e) {
            throw new PdfProcessingException("'" + token + "' is not a valid page number.");
        }
        if (page < 1 || page > totalPages) {
            throw new PdfProcessingException("Page " + page + " is out of range (document has " + totalPages + " pages).");
        }
        return page;
    }
}
