package com.ganesh.expensetracker.dto;

import lombok.Data;
import java.util.LinkedHashMap;
import java.util.Map;

@Data
public class WorkRowDto {
    private String id;
    /** JSON values retain their native Java type: String, Number, Boolean, or null. */
    private Map<String, Object> cells = new LinkedHashMap<>();
}
