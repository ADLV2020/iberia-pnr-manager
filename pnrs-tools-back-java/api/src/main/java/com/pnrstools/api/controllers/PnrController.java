package com.pnrstools.api.controllers;

import com.pnrstools.api.model.dto.CreatePnrRequest;
import com.pnrstools.api.model.dto.PnrRecordResponse;
import com.pnrstools.api.model.dto.UpdatePnrRequest;
import com.pnrstools.api.model.enums.DisruptionType;
import com.pnrstools.api.services.PnrService;
import com.pnrstools.api.services.SoapEnvelopeFactory;
import com.pnrstools.api.services.SoapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "PNR Management", description = "API para gestión de PNRs y disrupciones")
@Slf4j
public class PnrController {

    private final PnrService pnrService;
    private final SoapService soapService;
    private final SoapEnvelopeFactory envelopeFactory;

    @Operation(summary = "Obtener registros por tipo de vuelo")
    @GetMapping("/records/{type}")
    public ResponseEntity<List<PnrRecordResponse>> getRecords(@PathVariable String type) {
        return ResponseEntity.ok(pnrService.getRecords(type));
    }

    @Operation(summary = "Crear registro manual de PNR")
    @PostMapping("/save")
    public ResponseEntity<Map<String, String>> saveRecord(@RequestBody CreatePnrRequest request) {
        pnrService.saveRecord(request);
        return ResponseEntity.ok(Map.of("message", "Ticket y tramos guardados con éxito."));
    }

    @Operation(summary = "Actualizar registro existente")
    @PutMapping("/update")
    public ResponseEntity<Map<String, String>> updateRecord(@RequestBody UpdatePnrRequest request) {
        pnrService.updateRecord(request);
        return ResponseEntity.ok(Map.of("message", "Registro actualizado de forma consistente."));
    }

    @Operation(summary = "Inyectar disrupción SOAP")
    @PostMapping("/inject-disruption")
    public ResponseEntity<Map<String, Object>> triggerSoapDisruption(@RequestBody Map<String, Object> payload) {
        try {
            String pnr = (String) payload.get("pnr");
            String surname = (String) payload.get("surname");
            String flight = (String) payload.get("flight");
            String flightClass = (String) payload.get("flightClass");
            String date = (String) payload.get("date");
            String origin = (String) payload.get("origin");
            String destination = (String) payload.get("destination");
            String alternative = (String) payload.get("alternative");
            String disruptionTypeStr = (String) payload.get("disruptionType");

            DisruptionType disruptionType = DisruptionType.valueOf(disruptionTypeStr);
            SoapEnvelopeFactory.DisruptionData data = new SoapEnvelopeFactory.DisruptionData(
                    pnr, surname, flight, flightClass, date, origin, destination, alternative, disruptionType
            );

            SoapService.DisruptionResult result = soapService.executeDisruptionWithLogs(data);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Disrupción inyectada con éxito");
            response.put("result", result.result());
            response.put("logs", result.logs());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            errorResponse.put("logs", List.of());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @Operation(summary = "Verificar estado de VPN")
    @GetMapping("/vpn-status")
    public ResponseEntity<Map<String, Boolean>> checkVpnStatus() {
        return ResponseEntity.ok(Map.of("connected", soapService.checkVpnStatus()));
    }

    @Operation(summary = "Mock INT")
    @PostMapping("/disruption/mock-int")
    public ResponseEntity<Map<String, Object>> mockInt(@RequestBody Map<String, String> request) {
        String pnr = request.get("pnr");
        String surname = request.get("surname");
        Map<String, Object> result = soapService.callMockIntWithLogs(pnr, surname);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Mock PRE")
    @PostMapping("/disruption/mock-pre")
    public ResponseEntity<Map<String, Object>> mockPre(@RequestBody Map<String, String> request) {
        String pnr = request.get("pnr");
        String surname = request.get("surname");
        Map<String, Object> result = soapService.callMockPreWithLogs(pnr, surname);
        return ResponseEntity.ok(result);
    }

    @Operation(summary = "Disrupción UN")
    @PostMapping("/disruption/un")
    public ResponseEntity<Map<String, Object>> disruptionUN(@RequestBody Map<String, Object> payload) {
        payload.put("disruptionType", "UN");
        return triggerSoapDisruption(payload);
    }

    @Operation(summary = "Disrupción UNTK")
    @PostMapping("/disruption/untk")
    public ResponseEntity<Map<String, Object>> disruptionUNTK(@RequestBody Map<String, Object> payload) {
        payload.put("disruptionType", "UNTK");
        return triggerSoapDisruption(payload);
    }

    @Operation(summary = "Disrupción FLCH")
    @PostMapping("/disruption/flch")
    public ResponseEntity<Map<String, Object>> disruptionFLCH(@RequestBody Map<String, Object> payload) {
        payload.put("disruptionType", "FLCH");
        return triggerSoapDisruption(payload);
    }

    @Operation(summary = "Generar PNR v2 (síncrono)")
    @PostMapping("/v2/generate-pnr")
    public ResponseEntity<Map<String, Object>> generatePnrV2(@RequestBody Map<String, Object> request) {
        // Implementación similar a la versión TypeScript
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("pnr", "TESTPNR");
        response.put("orderId", "TEST123");
        response.put("flightDetails", List.of());
        response.put("from", "MAD");
        response.put("to", "BCN");
        response.put("flight", "IB1234");
        response.put("date", "2026-07-01");
        response.put("time", "10:00");
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Generar PNR v2 (streaming SSE)")
    @PostMapping(value = "/v2/generate-pnr-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generatePnrV2Stream(@RequestBody Map<String, Object> request) {
        SseEmitter emitter = new SseEmitter(120000L);
        ExecutorService executor = Executors.newSingleThreadExecutor();

        executor.execute(() -> {
            try {
                emitter.send(SseEmitter.event().name("log").data(Map.of("message", "Iniciando generación de PNR...")));
                Thread.sleep(1000);

                // Simular proceso
                emitter.send(SseEmitter.event().name("log").data(Map.of("message", "Autenticando...")));
                Thread.sleep(1000);

                emitter.send(SseEmitter.event().name("success").data(Map.of(
                        "pnr", "TESTPNR",
                        "orderId", "TEST123",
                        "flightDetails", List.of(),
                        "from", "MAD",
                        "to", "BCN",
                        "flight", "IB1234",
                        "date", "2026-07-01",
                        "time", "10:00"
                )));
                emitter.complete();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error").data(Map.of("message", e.getMessage())));
                } catch (IOException ignored) {}
                emitter.completeWithError(e);
            }
        });

        executor.shutdown();
        return emitter;
    }
}
