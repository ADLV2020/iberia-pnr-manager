package com.pnrstools.api.services;

import com.pnrstools.api.config.EndpointsConfig;
import com.pnrstools.api.model.enums.DisruptionType;
import com.pnrstools.api.services.SoapEnvelopeFactory.DisruptionData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SoapService {

    private final EndpointsConfig endpointsConfig;
    private final SoapEnvelopeFactory envelopeFactory;
    private final WebClient webClient = WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
            .build();

    public record SoapStepLog(
            String step,
            String method,
            String url,
            String requestBody,
            Integer status,
            boolean success,
            String error,
            String responseData
    ) {}

    public record DisruptionResult(
            String result,
            List<SoapStepLog> logs
    ) {}

    public DisruptionResult executeDisruptionWithLogs(DisruptionData data) {
        String envelope = envelopeFactory.getEnvelope(data);
        String stepName = "Disrupción " + data.disruptionType() + " - " + data.pnr();

        return callSoapServiceWithLogs(
                stepName,
                endpointsConfig.getSoapDisruption(),
                endpointsConfig.getSoapAction(),
                envelope
        );
    }

    private DisruptionResult callSoapServiceWithLogs(String step, String url, String soapAction, String envelope) {
        SoapStepLog log = new SoapStepLog(step, "POST", url, envelope, null, false, null, null);

        try {
            String response = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_XML_VALUE + "; charset=utf-8")
                    .header("SOAPAction", soapAction)
                    .bodyValue(envelope)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .flatMap(body -> Mono.error(new RuntimeException("SOAP error: " + body))))
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            log = new SoapStepLog(step, "POST", url, envelope, 200, true, null, response);

            if (response != null && response.contains("<faultstring>")) {
                throw new RuntimeException("SOAP fault: " + response.substring(0, Math.min(500, response.length())));
            }

            return new DisruptionResult(response, List.of(log));
        } catch (Exception e) {
            log = new SoapStepLog(step, "POST", url, envelope, null, false, e.getMessage(), null);
            throw new RuntimeException("Error en llamada SOAP", e);
        }
    }

    public Map<String, Object> callMockWithLogs(String step, String url, Map<String, Object> body) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("logs", Collections.emptyList());

        try {
            String response = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            result.put("success", true);
            result.put("data", response);
            result.put("logs", List.of(Map.of(
                    "step", step,
                    "method", "POST",
                    "url", url,
                    "requestBody", body,
                    "status", 200,
                    "success", true,
                    "responseData", response
            )));
            return result;
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
            result.put("logs", List.of(Map.of(
                    "step", step,
                    "method", "POST",
                    "url", url,
                    "requestBody", body,
                    "success", false,
                    "error", e.getMessage()
            )));
            return result;
        }
    }

    public boolean checkVpnStatus() {
        try {
            webClient.head()
                    .uri(endpointsConfig.getMockInt())
                    .retrieve()
                    .toBodilessEntity()
                    .timeout(Duration.ofSeconds(5))
                    .block();
            return true;
        } catch (Exception e) {
            log.warn("VPN check failed: {}", e.getMessage());
            return false;
        }
    }

    public Map<String, Object> callMockIntWithLogs(String pnr, String surname) {
        Map<String, Object> body = new HashMap<>();
        body.put("locator", pnr);
        body.put("surname", surname);
        return callMockWithLogs("Mock INT", endpointsConfig.getMockInt(), body);
    }

    public Map<String, Object> callMockPreWithLogs(String pnr, String surname) {
        Map<String, Object> body = new HashMap<>();
        body.put("locator", pnr);
        body.put("surname", surname);
        return callMockWithLogs("Mock PRE", endpointsConfig.getMockPre(), body);
    }
}
