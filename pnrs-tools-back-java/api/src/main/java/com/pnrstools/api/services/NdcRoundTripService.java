package com.pnrstools.api.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pnrstools.api.model.PnrSegment;
import com.pnrstools.api.model.PnrTicket;
import com.pnrstools.api.model.dto.CreateNdcRoundTripDto;
import com.pnrstools.api.model.enums.FlightType;
import com.pnrstools.api.model.enums.SegmentStatus;
import com.pnrstools.api.repositories.PnrSegmentRepository;
import com.pnrstools.api.repositories.PnrTicketRepository;
import com.pnrstools.api.util.PnrUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j  // ← Verifica que esta anotación está presente para generar 'log'
public class NdcRoundTripService {

    private final PnrTicketRepository ticketRepository;
    private final PnrSegmentRepository segmentRepository;

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

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebClient webClient = WebClient.builder().build();
    private String accessToken;

    @Transactional
    public void persistRoundTripBooking(String pnr, String surname, CreateNdcRoundTripDto dto) {
        // Usar importaciones directas sin el prefijo completo
        PnrTicket ticket = PnrTicket.builder()
                .flightType(FlightType.round_trip)
                .pnr(pnr)
                .surname(surname)
                .isAmadeus("NOT")
                .userCreation("SISTEMA_NDC")
                .build();

        PnrTicket savedTicket = ticketRepository.save(ticket);

        // Segmento Ida (GO)
        String exportDataGo = PnrUtils.generateApiString(
                pnr, "IB101", "Y", dto.getOutboundDate(), dto.getOrigin(), dto.getDestination(), "", "TK", surname
        );

        PnrSegment goSegment = PnrSegment.builder()
                .ticket(savedTicket)
                .direction("GO")
                .sequence(1)
                .flight("IB101")
                .originFrom(dto.getOrigin())
                .destinationTo(dto.getDestination())
                .date(dto.getOutboundDate())
                .time("10:00")
                .flightClass("Y")
                .isInvoiced("NOT")
                .exportData(exportDataGo)
                .status(SegmentStatus.FREE_TO_USE)
                .build();

        segmentRepository.save(goSegment);

        // Segmento Vuelta (RETURN)
        String exportDataReturn = PnrUtils.generateApiString(
                pnr, "IB102", "Y", dto.getInboundDate(), dto.getDestination(), dto.getOrigin(), "", "TK", surname
        );

        PnrSegment returnSegment = PnrSegment.builder()
                .ticket(savedTicket)
                .direction("RETURN")
                .sequence(1)
                .flight("IB102")
                .originFrom(dto.getDestination())
                .destinationTo(dto.getOrigin())
                .date(dto.getInboundDate())
                .time("18:00")
                .flightClass("Y")
                .isInvoiced("NOT")
                .exportData(exportDataReturn)
                .status(SegmentStatus.FREE_TO_USE)
                .build();

        segmentRepository.save(returnSegment);
    }

    // Método principal
    public Map<String, Object> createRoundTripBooking(CreateNdcRoundTripDto dto) {
        try {
            String pnr = "NDC" + System.currentTimeMillis() % 10000;
            String orderId = "ORD" + System.currentTimeMillis() % 10000;

            // Asegurarse de que passengerDetails no esté vacío
            if (dto.getPassengerDetails() == null || dto.getPassengerDetails().isEmpty()) {
                throw new RuntimeException("No se proporcionaron detalles de pasajeros");
            }

            persistRoundTripBooking(pnr, dto.getPassengerDetails().get(0).getFirstSurname(), dto);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", "Reserva Round-Trip creada y guardada exitosamente");
            response.put("pnr", pnr);
            response.put("orderId", orderId);
            response.put("totalPrice", "EUR 150.00");
            response.put("paymentMethods", List.of());

            return response;
        } catch (Exception e) {
            log.error("Error en NDC Round-Trip: ", e);  // ← 'log' viene de @Slf4j
            throw new RuntimeException("Error al crear reserva NDC: " + e.getMessage());
        }
    }
    
}