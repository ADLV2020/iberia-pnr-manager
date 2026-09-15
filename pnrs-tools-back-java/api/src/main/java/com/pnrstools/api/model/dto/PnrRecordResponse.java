package com.pnrstools.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PnrRecordResponse {
    private String id;
    private String raw;
    private List<String> parts;
    private List<Map<String, Object>> rawSegments;

}
