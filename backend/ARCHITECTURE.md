# PDS PDF Backend — Architecture

Spring Boot REST API jo saare PDF operations (merge, split, compress, rotate, convert, protect, watermark, etc.) handle karta hai. Apache PDFBox library asli PDF manipulation ke liye use hoti hai.

## Layered architecture

```
HTTP request
     |
     v
Controller layer      PdfController.java
  - HTTP ka kaam: @RequestParam se input nikalna, response ka
    shape (headers, content-type, filename) banana.
  - Koi business logic nahi — seedha service ko delegate karta hai.
     |
     v
Service layer          MergeService, SplitService, CompressService,
                        RotateService, WatermarkService, ProtectService,
                        UnlockService, PdfToImageService, ImageToPdfService,
                        PdfToWordService, WordToPdfService,
                        PageManagementService, PdfInfoService
  - Asli kaam: PDFBox library use karke PDF ko actually process karna.
  - HTTP ka koi pata nahi — sirf byte[] / MultipartFile leta-deta hai.
  - Isliye kabhi bhi (CLI tool, background job, etc.) reuse ho sakta hai
    bina HTTP layer ke.
     |
     v (agar exception throw ho)
Exception layer        GlobalExceptionHandler.java (@RestControllerAdvice)
  - Har controller ki exceptions yahan globally pakadi jaati hain.
  - Consistent JSON shape: {"error": "message"} + sahi HTTP status.
```

**Kyun 3 layers alag:** Single Responsibility Principle — har layer ka ek hi kaam hai. Controller ko PDFBox ka pata nahi, Service ko HTTP ka pata nahi. Fayda: Service layer ko unit test karna easy hai (HTTP server start karne ki zaroorat nahi), aur agar kal REST ke bajaye koi doosra transport layer (jaise gRPC) chahiye ho, Service layer bina badlaav ke reuse ho jaayega.

## Request flow diagram

```mermaid
sequenceDiagram
    participant Client
    participant Controller as PdfController
    participant Service as e.g. RotateService
    participant PDFBox
    participant EH as GlobalExceptionHandler

    Client->>Controller: POST /api/pdf/rotate (multipart: file, angle, pages)
    Controller->>Service: rotateService.rotate(file, angle, pages)
    Service->>PDFBox: Loader.loadPDF(bytes), page.setRotation(angle), doc.save()
    alt success
        PDFBox-->>Service: byte[] rotated PDF
        Service-->>Controller: byte[]
        Controller-->>Client: 200 OK, Content-Type: application/pdf,\nContent-Disposition: attachment; filename=rotated.pdf
    else PDFBox/IO error
        PDFBox-->>Service: throws IOException
        Service-->>EH: throws PdfProcessingException
        EH-->>Client: 400/500, {"error": "..."}
    end
```

## Endpoints

| Method & Path              | Required params                 | Optional params                        | Response                  |
|-----------------------------|----------------------------------|-----------------------------------------|----------------------------|
| POST `/api/pdf/info`        | `file`                           | —                                        | JSON `PdfInfoResponse`     |
| POST `/api/pdf/merge`       | `files` (2+)                     | —                                        | `merged.pdf`               |
| POST `/api/pdf/split`       | `file`                           | `ranges`                                 | `split.zip`                |
| POST `/api/pdf/compress`    | `file`                           | `level` (LOW\|MEDIUM\|HIGH, default MEDIUM) | `compressed.pdf`        |
| POST `/api/pdf/rotate`      | `file`, `angle`                  | `pages`                                  | `rotated.pdf`               |
| POST `/api/pdf/to-images`   | `file`                           | `format` (default png), `dpi` (default 150) | `pages.zip`             |
| POST `/api/pdf/images-to-pdf` | `files` (1+)                   | —                                        | `images.pdf`               |
| POST `/api/pdf/to-word`     | `file`                           | —                                        | `converted.docx`           |
| POST `/api/pdf/word-to-pdf` | `file`                           | —                                        | `converted.pdf`            |
| POST `/api/pdf/protect`     | `file`, `password`               | `ownerPassword`                          | `protected.pdf`            |
| POST `/api/pdf/unlock`      | `file`, `password`               | —                                        | `unlocked.pdf`             |
| POST `/api/pdf/watermark`   | `file`, `text`                   | `fontSize`(40), `opacity`(0.3), `color`(808080) | `watermarked.pdf`   |
| POST `/api/pdf/delete-pages`| `file`, `pages`                  | —                                        | `edited.pdf`                |
| POST `/api/pdf/extract-pages`| `file`, `pages`                 | —                                        | `extracted.pdf`             |
| POST `/api/pdf/page-numbers`| `file`                           | `position`(bottom-center), `start`(1)    | `numbered.pdf`              |

Sab `multipart/form-data` consume karte hain. Error response hamesha `{"error": "message"}` JSON hota hai — successful binary response ke saath confuse na ho, isliye frontend ko error-detection ke liye special logic chahiye padi (dekho frontend `ARCHITECTURE.md` mein `errors.ts`).

## Cross-cutting config

- `CorsConfig.java` — sirf `localhost:5173` (frontend dev server) se requests allow karta hai, aur `Content-Disposition` header ko expose karta hai (isके bina browser JS us header ko read nahi kar sakta — filename frontend ko pata nahi chalta).
- `application.properties` — max upload size 100MB/file, 200MB/request.
