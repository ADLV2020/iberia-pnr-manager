package com.pnrstools.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePnrRequest {
    private String recordId;
    private String flightType;
    private String pnr;
    private String lastName;
    private Boolean isAmadeus;
    private Boolean isInvoiced;
    private List<CreatePnrRequest.SegmentDto> segments;
    private List<String> statuses;
    private String userAbm;

}
