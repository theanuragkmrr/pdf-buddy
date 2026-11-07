package com.pds.pdfbackend.service;

import com.pds.pdfbackend.exception.PdfProcessingException;
import org.apache.pdfbox.io.IOUtils;
import org.apache.pdfbox.io.RandomAccessRead;
import org.apache.pdfbox.io.RandomAccessReadBuffer;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class MergeService {

    public byte[] merge(List<MultipartFile> files) {
        if (files == null || files.size() < 2) {
            throw new PdfProcessingException("Please upload at least two PDF files to merge.");
        }

        PDFMergerUtility merger = new PDFMergerUtility();
        List<RandomAccessRead> sources = new ArrayList<>();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (MultipartFile file : files) {
                RandomAccessRead source = new RandomAccessReadBuffer(file.getBytes());
                sources.add(source);
                merger.addSource(source);
            }

            merger.setDestinationStream(out);
            merger.mergeDocuments(IOUtils.createMemoryOnlyStreamCache());
            return out.toByteArray();
        } catch (IOException e) {
            throw new PdfProcessingException("Could not merge PDFs: " + e.getMessage(), e);
        } finally {
            for (RandomAccessRead source : sources) {
                try {
                    source.close();
                } catch (IOException ignored) {
                    // best-effort cleanup, merge result is already decided by this point
                }
            }
        }
    }
}
