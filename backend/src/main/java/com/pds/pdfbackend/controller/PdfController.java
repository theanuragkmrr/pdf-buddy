package com.pds.pdfbackend.controller;

import com.pds.pdfbackend.dto.PdfInfoResponse;
import com.pds.pdfbackend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfController {

    private final MergeService mergeService;
    private final SplitService splitService;
    private final CompressService compressService;
    private final RotateService rotateService;
    private final PdfToImageService pdfToImageService;
    private final ImageToPdfService imageToPdfService;
    private final PdfToWordService pdfToWordService;
    private final WordToPdfService wordToPdfService;
    private final ProtectService protectService;
    private final UnlockService unlockService;
    private final WatermarkService watermarkService;
    private final PageManagementService pageManagementService;
    private final PdfInfoService pdfInfoService;

    @PostMapping(value = "/info", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PdfInfoResponse info(@RequestParam("file") MultipartFile file) {
        return pdfInfoService.info(file);
    }

    @PostMapping(value = "/merge", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> merge(@RequestParam("files") List<MultipartFile> files) {
        return pdfFile(mergeService.merge(files), "merged.pdf");
    }

    @PostMapping(value = "/split", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> split(@RequestParam("file") MultipartFile file,
                                         @RequestParam(value = "ranges", required = false) String ranges) {
        return zipFile(splitService.splitToZip(file, ranges), "split.zip");
    }

    @PostMapping(value = "/compress", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> compress(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "level", required = false, defaultValue = "MEDIUM") String level) {
        return pdfFile(compressService.compress(file, level), "compressed.pdf");
    }

    @PostMapping(value = "/rotate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> rotate(@RequestParam("file") MultipartFile file,
                                          @RequestParam("angle") int angle,
                                          @RequestParam(value = "pages", required = false) String pages) {
        return pdfFile(rotateService.rotate(file, angle, pages), "rotated.pdf");
    }

    @PostMapping(value = "/to-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> toImages(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "format", required = false, defaultValue = "png") String format,
                                            @RequestParam(value = "dpi", required = false, defaultValue = "150") int dpi) {
        return zipFile(pdfToImageService.toImagesZip(file, format, dpi), "pages.zip");
    }

    @PostMapping(value = "/images-to-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> imagesToPdf(@RequestParam("files") List<MultipartFile> files) {
        return pdfFile(imageToPdfService.convert(files), "images.pdf");
    }

    @PostMapping(value = "/to-word", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> toWord(@RequestParam("file") MultipartFile file) {
        return fileResponse(pdfToWordService.convertToDocx(file), "converted.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }

    @PostMapping(value = "/word-to-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> wordToPdf(@RequestParam("file") MultipartFile file) {
        return pdfFile(wordToPdfService.convertToPdf(file), "converted.pdf");
    }

    @PostMapping(value = "/protect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> protect(@RequestParam("file") MultipartFile file,
                                           @RequestParam("password") String password,
                                           @RequestParam(value = "ownerPassword", required = false) String ownerPassword) {
        return pdfFile(protectService.protect(file, password, ownerPassword), "protected.pdf");
    }

    @PostMapping(value = "/unlock", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> unlock(@RequestParam("file") MultipartFile file,
                                          @RequestParam("password") String password) {
        return pdfFile(unlockService.unlock(file, password), "unlocked.pdf");
    }

    @PostMapping(value = "/watermark", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> watermark(@RequestParam("file") MultipartFile file,
                                             @RequestParam("text") String text,
                                             @RequestParam(value = "fontSize", required = false, defaultValue = "40") int fontSize,
                                             @RequestParam(value = "opacity", required = false, defaultValue = "0.3") float opacity,
                                             @RequestParam(value = "color", required = false, defaultValue = "808080") String color) {
        return pdfFile(watermarkService.addWatermark(file, text, fontSize, opacity, color), "watermarked.pdf");
    }

    @PostMapping(value = "/delete-pages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> deletePages(@RequestParam("file") MultipartFile file,
                                               @RequestParam("pages") String pages) {
        return pdfFile(pageManagementService.deletePages(file, pages), "edited.pdf");
    }

    @PostMapping(value = "/extract-pages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> extractPages(@RequestParam("file") MultipartFile file,
                                                @RequestParam("pages") String pages) {
        return pdfFile(pageManagementService.extractPages(file, pages), "extracted.pdf");
    }

    @PostMapping(value = "/page-numbers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> pageNumbers(@RequestParam("file") MultipartFile file,
                                               @RequestParam(value = "position", required = false, defaultValue = "bottom-center") String position,
                                               @RequestParam(value = "start", required = false, defaultValue = "1") int start) {
        return pdfFile(pageManagementService.addPageNumbers(file, position, start), "numbered.pdf");
    }

    private ResponseEntity<byte[]> pdfFile(byte[] data, String filename) {
        return fileResponse(data, filename, MediaType.APPLICATION_PDF_VALUE);
    }

    private ResponseEntity<byte[]> zipFile(byte[] data, String filename) {
        return fileResponse(data, filename, "application/zip");
    }

    private ResponseEntity<byte[]> fileResponse(byte[] data, String filename, String contentType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.add(HttpHeaders.CONTENT_TYPE, contentType);
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
