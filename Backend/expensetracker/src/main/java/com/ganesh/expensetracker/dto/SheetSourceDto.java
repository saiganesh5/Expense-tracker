package com.ganesh.expensetracker.dto;

import lombok.Data;

@Data
public class SheetSourceDto {
    private String originalUrl;
    private String csvUrl;
    private String gid;
    private String lastSyncedAt;
    private String lastError;
}
