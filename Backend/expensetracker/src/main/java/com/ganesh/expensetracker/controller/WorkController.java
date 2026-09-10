package com.ganesh.expensetracker.controller;

import com.ganesh.expensetracker.dto.WorkDto;
import com.ganesh.expensetracker.service.WorkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/works")
@RequiredArgsConstructor
public class WorkController {
    private final WorkService workService;

    @GetMapping
    public List<WorkDto> list(Authentication authentication) {
        return workService.list(authentication.getName());
    }

    @PutMapping("/{id}")
    public WorkDto save(@PathVariable String id, @Valid @RequestBody WorkDto work, Authentication authentication) {
        return workService.save(authentication.getName(), id, work);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication authentication) {
        workService.delete(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
