package com.elm.practice.controller;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.ApiResponse;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.domain.Domain;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {
    private static final long MAX_SIZE = 2L * 1024 * 1024;
    private static final Map<String,String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp");
    private final Path uploadDir;

    public FileController(@Value("${file.upload-dir:uploads}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostMapping("/images")
    public ApiResponse<?> upload(@RequestParam MultipartFile file,
                                 @RequestParam(defaultValue = "product") String scene,
                                 HttpSession session) {
        Domain.Principal principal = RequestUtil.principal(session);
        String normalizedScene = scene == null ? "" : scene.trim().toLowerCase();
        if (!Set.of("product", "review").contains(normalizedScene))
            throw ApiException.badRequest("scene 必须为 product 或 review");
        if (normalizedScene.equals("product") && principal.role() != Domain.Role.MERCHANT)
            throw ApiException.forbidden("用户不能上传商品图片");
        if (normalizedScene.equals("review") && principal.role() != Domain.Role.USER)
            throw ApiException.forbidden("商家不能上传评价图片");
        if (file == null || file.isEmpty()) throw ApiException.badRequest("file 不能为空");
        if (file.getSize() > MAX_SIZE) throw ApiException.badRequest("图片大小不能超过 2MB");
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String extension = EXTENSIONS.get(contentType);
        if (extension == null) throw ApiException.badRequest("图片类型仅支持 jpg/jpeg/png/webp");
        String fileName = UUID.randomUUID().toString().replace("-", "") + extension;
        try {
            Files.createDirectories(uploadDir);
            Path target = uploadDir.resolve(fileName).normalize();
            if (!target.getParent().equals(uploadDir)) throw ApiException.badRequest("非法文件名");
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    50000, "图片保存失败", null);
        }
        var data = new LinkedHashMap<String,Object>();
        data.put("url", "/uploads/" + fileName);
        data.put("fileName", fileName);
        data.put("size", file.getSize());
        data.put("contentType", contentType);
        return ApiResponse.success(data);
    }
}
