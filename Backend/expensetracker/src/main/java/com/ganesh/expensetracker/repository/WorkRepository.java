package com.ganesh.expensetracker.repository;

import com.ganesh.expensetracker.model.Work;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WorkRepository extends JpaRepository<Work, String> {
    List<Work> findAllByUserEmailOrderByCreatedAtDesc(String email);
    Optional<Work> findByIdAndUserEmail(String id, String email);
    void deleteByIdAndUserEmail(String id, String email);
}
