package com.pnrstools.api.controllers;

import com.pnrstools.api.model.dto.CreateNdcRoundTripDto;
import com.pnrstools.api.services.NdcRoundTripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ndc")
@RequiredArgsConstructor  // ← Lombok genera constructor con ndcRoundTripService
@Tag(name = "NDC Round-Trip", description = "API para creación de reservas NDC Round-Trip")
public class NdcController {

    private final NdcRoundTripService ndcRoundTripService;  // ← Inyectado por constructor

    @Operation(summary = "Crea una reserva NDC Round-Trip")
    @PostMapping("/round-trip")
    public ResponseEntity<Map<String, Object>> createRoundTrip(@RequestBody CreateNdcRoundTripDto dto) {
        try {
            Map<String, Object> result = ndcRoundTripService.createRoundTripBooking(dto);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
}
