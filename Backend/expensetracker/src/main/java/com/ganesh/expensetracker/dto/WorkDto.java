package com.ganesh.expensetracker.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

/** API representation of every piece of frontend work state. */
@Data
public class WorkDto {
    @NotBlank private String id;
    @NotBlank private String name;
    private String description = "";
    private String color;
    private String createdAt;
    private Integer rowCount;
    private BigDecimal totalExpense;
    private String notes;
    @Valid private List<WorkColumnDto> columns = new ArrayList<>();
    @Valid private List<WorkRowDto> rows = new ArrayList<>();
    @Valid private SheetSourceDto sheet;
}
