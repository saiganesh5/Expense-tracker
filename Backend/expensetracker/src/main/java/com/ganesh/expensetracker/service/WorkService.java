package com.ganesh.expensetracker.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ganesh.expensetracker.dto.WorkDto;
import com.ganesh.expensetracker.model.User;
import com.ganesh.expensetracker.model.Work;
import com.ganesh.expensetracker.repository.UserRepository;
import com.ganesh.expensetracker.repository.WorkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.math.BigDecimal;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WorkService {
    private final WorkRepository workRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<WorkDto> list(String email) {
        return workRepository.findAllByUserEmailOrderByCreatedAtDesc(email).stream().map(this::read).toList();
    }

    @Transactional
    public WorkDto save(String email, String id, WorkDto dto) {
        if (!id.equals(dto.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work id must match the URL");
        }
        if (dto.getCreatedAt() == null || dto.getCreatedAt().isBlank()) {
            dto.setCreatedAt(java.time.Instant.now().toString());
        }
        if (dto.getRows() == null) {
            dto.setRows(new java.util.ArrayList<>());
        }
        if (dto.getColumns() == null) {
            dto.setColumns(new java.util.ArrayList<>());
        }

        Work work = workRepository.findByIdAndUserEmail(id, email).orElseGet(() -> Work.builder()
                .id(id)
                .user(user(email))
                .build());
        work.setCreatedAt(dto.getCreatedAt());
        work.setRowCount(dto.getRows().size());
        work.setTotalExpense(totalExpense(dto));
        dto.setRowCount(work.getRowCount());
        dto.setTotalExpense(work.getTotalExpense());
        work.setPayload(write(dto));
        return read(workRepository.save(work));
    }

    @Transactional
    public void delete(String email, String id) {
        Work work = workRepository.findByIdAndUserEmail(id, email).orElse(null);
        if (work == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Work not found");
        }
        // Delete the managed, owner-checked entity explicitly. This avoids the
        // derived bulk-delete method being run outside a write transaction.
        workRepository.delete(work);
        workRepository.flush();
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private WorkDto read(Work work) {
        try {
            WorkDto dto = objectMapper.readValue(work.getPayload(), WorkDto.class);
            dto.setRowCount(work.getRowCount());
            dto.setTotalExpense(work.getTotalExpense());
            return dto;
        }
        catch (JsonProcessingException e) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stored work is invalid", e); }
    }

    private String write(WorkDto dto) {
        try { return objectMapper.writeValueAsString(dto); }
        catch (JsonProcessingException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work cannot be saved", e); }
    }

    private BigDecimal totalExpense(WorkDto work) {
        if (work.getColumns() == null || work.getRows() == null) {
            return BigDecimal.ZERO;
        }
        Set<String> currencyColumnIds = work.getColumns().stream()
                .filter(column -> column != null && "currency".equals(column.getType()))
                .map(column -> column.getId())
                .filter(id -> id != null)
                .collect(java.util.stream.Collectors.toSet());

        return work.getRows().stream()
                .filter(row -> row != null && row.getCells() != null)
                .flatMap(row -> currencyColumnIds.stream().map(id -> row.getCells().get(id)))
                .filter(value -> value instanceof Number || (value instanceof String && !((String) value).isBlank()))
                .map(value -> {
                    if (value instanceof Number n) {
                        return new BigDecimal(n.toString());
                    }
                    String clean = value.toString().replaceAll("[^0-9.-]", "");
                    if (clean.isBlank() || "-".equals(clean) || ".".equals(clean)) {
                        return BigDecimal.ZERO;
                    }
                    try {
                        return new BigDecimal(clean);
                    } catch (NumberFormatException ignored) {
                        return BigDecimal.ZERO;
                    }
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
