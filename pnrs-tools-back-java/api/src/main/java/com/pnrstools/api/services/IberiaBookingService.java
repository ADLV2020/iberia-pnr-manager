package com.pnrstools.api.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pnrstools.api.model.PnrSegment;
import com.pnrstools.api.model.PnrTicket;
import com.pnrstools.api.model.enums.FlightType;
import com.pnrstools.api.model.enums.SegmentStatus;
import com.pnrstools.api.repositories.PnrSegmentRepository;
import com.pnrstools.api.repositories.PnrTicketRepository;
import com.pnrstools.api.util.PnrUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class IberiaBookingService {

    private final PnrTicketRepository ticketRepository;
    private final PnrSegmentRepository segmentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${auth.url:}")
    private String authUrl;

    @Value("${auth.basic.credentials:}")
    private String authBasicCredentials;

    @Value("${auth2.header:Basic DC_exit/kOGBOp864E0DQmbz.uJU}")
    private String auth2Header;

    @Value("${app.version:200}")
    private String appVersion;

    @Value("${host.url:}")
    private String hostUrl;

    @Value("${host.url.orm:}")
    private String hostUrlOrm;

    @Value("${cookie.string:}")
    private String cookieString;

    private final WebClient webClient = WebClient.builder()
            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024))
            .build();

    private String accessToken;

    private static final String DEFAULT_COOKIE = "mt.v=2.1037978947.1778589064559; _cq_duid=1.1778589064.c1uj7YORL5CzwQI4; _fbp=fb.1.1778589066107.20468017513695995; _ga=GA1.1.1612261184.1778589066; _twpid=tw.1778589066156.259429965760051712; QuantumMetricUserID=68abaadafa44b1f77eb30e0a25352d0a; rskxRunCookie=0; rCookie=frnw2tsavorzyk2bv9g388mpf874we; OptanonAlertBoxClosed=2026-05-21T09:54:25.791Z; _gcl_gs=2.1.k1$i1779869426$u168300281; _gcl_aw=GCL.1779869429.EAIaIQobChMI9OLmkoLZlAMVSZpoCR0wNwFwEAMYASAAEgKXgPD_BwE; OptanonConsent=isGpcEnabled=0&datestamp=Wed+May+27+2026+11%3A15%3A54+GMT%2B0200+(hora+de+verano+de+Europa+central)&version=202212.1.0&isIABGlobal=false&hosts=&consentId=c4f4ee9d-0c67-427c-be29-c628e8de2afb&interactionCount=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0005%3A1%2CC0004%3A1%2CC0003%3A1&geolocation=ES%3BCT&AwaitingReconsent=false;";

    public record PassengerData(
            String firstName,
            String surname,
            String email,
            String phone
    ) {}

    public record FlightData(
            String origin,
            String destination,
            String date,
            String returnDate,
            String flightType
    ) {}

    public record ProcessedSegment(
            String origin,
            String destination,
            String flightNumber,
            String date,
            String departureTime,
            String arrivalTime,
            String bookingClass,
            String direction,
            Integer sequence,
            String from,
            String to,
            String flight,
            String time,
            String clazz
    ) {}

    private Mono<JsonNode> request(String stepName, String url, String method, Map<String, String> headers,
                                   Object body, boolean isAuthRequest) {
        return Mono.fromCallable(() -> {
            log.info("{} - Request to: {}", stepName, url);
            WebClient.RequestBodySpec requestSpec = webClient.method(org.springframework.http.HttpMethod.valueOf(method))
                    .uri(url);

            headers.forEach(requestSpec::header);

            if (body != null) {
                requestSpec.body(BodyInserters.fromValue(body));
            }

            try {
                String response = requestSpec.retrieve()
                        .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                clientResponse -> clientResponse.bodyToMono(String.class)
                                        .flatMap(errBody -> Mono.error(new RuntimeException("HTTP Error: " + errBody))))
                        .bodyToMono(String.class)
                        .timeout(Duration.ofSeconds(30))
                        .block();

                return objectMapper.readTree(response);
            } catch (Exception e) {
                throw new RuntimeException("Error en " + stepName + ": " + e.getMessage(), e);
            }
        });
    }

    public Mono<String> authenticate() {
        String url = authUrl.isEmpty() ? "https://int-ibisservices.iberia.com/api/auth/realms/commercial_platform/protocol/openid-connect/token" : authUrl;
        Map<String, String> headers = new HashMap<>();
        headers.put(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE);
        headers.put(HttpHeaders.AUTHORIZATION, authBasicCredentials);
        headers.put("Authorization2", auth2Header);

        String body = "grant_type=client_credentials&login_hint=keycloak";

        return request("1. Autenticación", url, "POST", headers, body, true)
                .map(node -> {
                    this.accessToken = node.get("access_token").asText();
                    return this.accessToken;
                });
    }

    public Mono<JsonNode> checkAvailability(FlightData flight) {
        String url = hostUrl.isEmpty() ? "https://int-ibisservices.iberia.com/api/sse-avm/rs/v2/availability/itinerary" : hostUrl + "/sse-avm/rs/v2/availability/itinerary";

        Map<String, String> headers = new HashMap<>();
        headers.put(HttpHeaders.ACCEPT, "application/json, text/plain, */*");
        headers.put("Accept-Language", "es-ES");
        headers.put(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        headers.put("Authorization2", auth2Header);
        headers.put("Cache-Control", "no-cache");
        headers.put(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        headers.put(HttpHeaders.COOKIE, cookieString != null && !cookieString.isEmpty() ? cookieString : DEFAULT_COOKIE);
        headers.put(HttpHeaders.ORIGIN, "https://int.iberia.com");
        headers.put(HttpHeaders.REFERER, "https://int.iberia.com");
        headers.put(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

        List<Map<String, String>> slices = new ArrayList<>();
        Map<String, String> outbound = new HashMap<>();
        outbound.put("origin", flight.origin());
        outbound.put("destination", flight.destination());
        outbound.put("date", flight.date());
        slices.add(outbound);

        if ("round-trip".equals(flight.flightType()) && flight.returnDate() != null) {
            Map<String, String> inbound = new HashMap<>();
            inbound.put("origin", flight.destination());
            inbound.put("destination", flight.origin());
            inbound.put("date", flight.returnDate());
            slices.add(inbound);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("isPetFlight", false);
        body.put("slices", slices);
        body.put("passengers", List.of(Map.of("passengerType", "ADULT", "count", 1)));
        body.put("marketCode", "ES");
        body.put("preferredCabin", "ECONOMY");

        return request("2. Availability", url, "POST", headers, body, false);
    }

    // Métodos adicionales de NDC (priceFare, createOrder, etc.) se implementan similarmente
    // con WebClient siguiendo el mismo patrón

    @Transactional
    public void saveToDatabase(String pnr, String surname, String flightType, List<ProcessedSegment> segments) {
        PnrTicket ticket = PnrTicket.builder()
                .flightType(FlightType.valueOf(flightType))
                .pnr(pnr)
                .surname(surname)
                .isAmadeus("YES")
                .userCreation("SISTEMA_NDC")
                .build();

        PnrTicket savedTicket = ticketRepository.save(ticket);

        for (ProcessedSegment seg : segments) {
            String apiString = PnrUtils.generateApiString(
                    pnr,
                    seg.flightNumber(),
                    seg.bookingClass(),
                    seg.date(),
                    seg.origin(),
                    seg.destination(),
                    "",
                    "",
                    surname
            );

            PnrSegment segment = PnrSegment.builder()
                    .ticket(savedTicket)
                    .direction(seg.direction())
                    .sequence(seg.sequence() != null ? seg.sequence() : 1)
                    .flight(seg.flightNumber())
                    .originFrom(seg.origin())
                    .destinationTo(seg.destination())
                    .date(seg.date())
                    .time(seg.departureTime())
                    .arrivalTime(seg.arrivalTime())
                    .flightClass(seg.bookingClass())
                    .isInvoiced("YES")
                    .exportData(apiString)
                    .status(SegmentStatus.FREE_TO_USE)
                    .build();

            segmentRepository.save(segment);
        }
    }

    // Método executeFullFlow orquestando todos los pasos
    public Mono<Map<String, Object>> executeFullFlow(FlightData flight, PassengerData passenger) {
        return authenticate()
                .flatMap(token -> {
                    log.info("Autenticación exitosa");
                    return checkAvailability(flight);
                })
                .flatMap(availability -> {
                    log.info("Availability obtenida");
                    // Procesar y continuar con los siguientes pasos...
                    Map<String, Object> result = new HashMap<>();
                    result.put("pnr", "TESTPNR");
                    result.put("orderId", "TEST123");
                    result.put("flightDetails", List.of());
                    return Mono.just(result);
                });
    }
}
