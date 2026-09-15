package com.pnrstools.api.model.dto;

import com.pnrstools.api.model.enums.FlightType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePnrRequest {
    private FlightType flightType;
    private String pnr;
    private String lastName;
    private Boolean isAmadeus;
    private Boolean isInvoiced;
    private List<SegmentDto> segments;
    private String user;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SegmentDto {
        private String direction;
        private String flight;
        private String from;
        private String to;
        private String date;
        private String time;
        private String arrivalTime;
        private String clazz;  // ← CAMBIADO de "class" a "clazz" (porque "class" es palabra reservada)
        private String rerouting;
        private String type;
    }

}
