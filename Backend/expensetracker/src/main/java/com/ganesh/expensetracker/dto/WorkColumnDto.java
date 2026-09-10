package com.ganesh.expensetracker.dto;

import lombok.Data;
import java.util.List;

@Data
public class WorkColumnDto {
    private String id;
    private String name;
    private String type;
    private List<String> options;
    private String source;
    private Integer sheetIndex;
}
