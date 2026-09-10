package com.ganesh.expensetracker.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/** A complete user-owned work document. Its JSON payload keeps columns, rows, notes and sheet metadata atomic. */
@Entity
@Table(name = "works", indexes = @Index(name = "idx_works_user", columnList = "user_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Work {

    @Id
    @Column(length = 64, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String createdAt;

    @Column(nullable = false)
    private int rowCount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal totalExpense;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;
}
