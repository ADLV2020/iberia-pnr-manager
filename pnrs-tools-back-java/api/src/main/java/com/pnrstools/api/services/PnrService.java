package com.pnrstools.api.services;

import com.pnrstools.api.model.PnrSegment;
import com.pnrstools.api.model.PnrTicket;
import com.pnrstools.api.model.dto.CreatePnrRequest;
import com.pnrstools.api.model.dto.PnrRecordResponse;
import com.pnrstools.api.model.dto.UpdatePnrRequest;
import com.pnrstools.api.model.enums.FlightType;
import com.pnrstools.api.model.enums.SegmentStatus;
import com.pnrstools.api.repositories.PnrSegmentRepository;
import com.pnrstools.api.repositories.PnrTicketRepository;
import com.pnrstools.api.util.PnrUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PnrService {

    private final PnrTicketRepository ticketRepository;
    private final PnrSegmentRepository segmentRepository;

    public List<PnrRecordResponse> getRecords(String flightType) {
        FlightType type = FlightType.valueOf(flightType);
        List<PnrTicket> tickets = ticketRepository.findByFlightTypeOrderByIdDesc(type);

        List<PnrRecordResponse> records = new ArrayList<>();
        for (PnrTicket ticket : tickets) {
            List<PnrSegment> segments = segmentRepository.findByTicketIdOrderByDirectionDescSequenceAsc(ticket.getId());

            List<PnrSegment> goSegments = segments.stream()
                    .filter(s -> "GO".equals(s.getDirection()))
                    .collect(Collectors.toList());
            List<PnrSegment> returnSegments = segments.stream()
                    .filter(s -> "RETURN".equals(s.getDirection()))
                    .collect(Collectors.toList());

            PnrSegment seg1 = goSegments.isEmpty() ? null : goSegments.get(0);
            PnrSegment seg2 = returnSegments.isEmpty() ?
                    (goSegments.size() > 1 ? goSegments.get(1) : null) :
                    returnSegments.get(0);

            String paddedId = String.format("%05d", ticket.getId());
            String isInvoicedCombined = "NOT";
            if (seg1 != null && "YES".equals(seg1.getIsInvoiced()) ||
                seg2 != null && "YES".equals(seg2.getIsInvoiced())) {
                isInvoicedCombined = "YES";
            }

            List<String> parts = new ArrayList<>();
            parts.add(paddedId);
            parts.add(ticket.getPnr());
            parts.add(ticket.getSurname());
            parts.add(ticket.getIsAmadeus());
            parts.add(isInvoicedCombined);

            if (seg1 != null) {
                parts.add(seg1.getOriginFrom() != null ? seg1.getOriginFrom() : "");
                parts.add(seg1.getDestinationTo() != null ? seg1.getDestinationTo() : "");
                parts.add(seg1.getFlight() != null ? seg1.getFlight() : "");
                parts.add(seg1.getFlightClass() != null ? seg1.getFlightClass() : "");
                parts.add(seg1.getDate() != null ? seg1.getDate() : "");
                parts.add(seg1.getTime() != null ? seg1.getTime() : "");
                parts.add(seg1.getRerouting() != null ? seg1.getRerouting() : "");
                parts.add(seg1.getDisruptionType() != null ? seg1.getDisruptionType().name() : "");
                parts.add(seg1.getExportData() != null ? seg1.getExportData() : "");
                parts.add(seg1.getStatus() != null ? seg1.getStatus().name() : "FREE");
            } else {
                for (int i = 0; i < 10; i++) parts.add("");
            }

            if (!"one-way".equals(flightType) && seg2 != null) {
                parts.add(seg2.getOriginFrom() != null ? seg2.getOriginFrom() : "");
                parts.add(seg2.getDestinationTo() != null ? seg2.getDestinationTo() : "");
                parts.add(seg2.getFlight() != null ? seg2.getFlight() : "");
                parts.add(seg2.getFlightClass() != null ? seg2.getFlightClass() : "");
                parts.add(seg2.getDate() != null ? seg2.getDate() : "");
                parts.add(seg2.getTime() != null ? seg2.getTime() : "");
                parts.add(seg2.getRerouting() != null ? seg2.getRerouting() : "");
                parts.add(seg2.getDisruptionType() != null ? seg2.getDisruptionType().name() : "");
                parts.add(seg2.getExportData() != null ? seg2.getExportData() : "");
                parts.add(seg2.getStatus() != null ? seg2.getStatus().name() : "FREE");
            }

            List<Map<String, Object>> rawSegments = segments.stream().map(s -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("direction", s.getDirection());
                map.put("sequence", s.getSequence());
                map.put("flight", s.getFlight());
                map.put("origin_from", s.getOriginFrom());
                map.put("destination_to", s.getDestinationTo());
                map.put("date", s.getDate());
                map.put("time", s.getTime());
                map.put("arrival_time", s.getArrivalTime());
                map.put("flight_class", s.getFlightClass());
                map.put("rerouting", s.getRerouting());
                map.put("disruption_type", s.getDisruptionType());
                map.put("schedule_change_type", s.getScheduleChangeType());
                map.put("is_invoiced", s.getIsInvoiced());
                map.put("export_data", s.getExportData());
                map.put("status", s.getStatus());
                return map;
            }).collect(Collectors.toList());

            records.add(PnrRecordResponse.builder()
                    .id(String.valueOf(ticket.getId()))
                    .raw(String.join(",", parts))
                    .parts(parts)
                    .rawSegments(rawSegments)
                    .build());
        }

        return records;

    }

    @Transactional
    public PnrTicket saveRecord(CreatePnrRequest request) {

        String amadeusValue = request.getIsAmadeus() != null && request.getIsAmadeus() ? "YES" : "NOT";

        PnrTicket ticket = PnrTicket.builder()
                .flightType(request.getFlightType())
                .pnr(request.getPnr())
                .surname(request.getLastName())
                .isAmadeus(amadeusValue)
                .userCreation(request.getUser() != null ? request.getUser() : "SISTEMA")
                .build();

        PnrTicket savedTicket = ticketRepository.save(ticket);

        int goCount = 0;
        int returnCount = 0;

        for (CreatePnrRequest.SegmentDto segDto : request.getSegments()) {

            if (segDto.getFlight() == null || segDto.getFlight().isEmpty()) continue;

            String direction = segDto.getDirection();
            int sequence;
            if ("GO".equals(direction)) {
                goCount++;
                sequence = goCount;
            } else {
                returnCount++;
                sequence = returnCount;
            }

            String apiString = PnrUtils.generateApiString(
                request.getPnr(),
                segDto.getFlight(),
                segDto.getClazz(),  // ← CAMBIADO de getClass() a getClazz()
                segDto.getDate(),
                segDto.getFrom(),
                segDto.getTo(),
                segDto.getRerouting(),
                segDto.getType(),
                request.getLastName()
            );

            String invoicedValue = request.getIsInvoiced() != null && request.getIsInvoiced() ? "YES" : "NOT";

            PnrSegment segment = PnrSegment.builder()
                    .ticket(savedTicket)
                    .direction(direction)
                    .sequence(sequence)
                    .flight(segDto.getFlight())
                    .originFrom(segDto.getFrom())
                    .destinationTo(segDto.getTo())
                    .date(segDto.getDate())
                    .time(segDto.getTime())
                    .arrivalTime(segDto.getArrivalTime())
                    .flightClass(segDto.getClazz())
                    .rerouting(segDto.getRerouting())
                    .isInvoiced(invoicedValue)
                    .exportData(apiString)
                    .status(SegmentStatus.FREE_TO_USE)
                    .build();

            segmentRepository.save(segment);

        }

        return savedTicket;

    }

    @Transactional
    public void updateRecord(UpdatePnrRequest request) {

        Long ticketId = Long.parseLong(request.getRecordId());
        String amadeusValue = request.getIsAmadeus() != null && request.getIsAmadeus() ? "YES" : "NOT";

        PnrTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Ticket no encontrado"));

        ticket.setPnr(request.getPnr());
        ticket.setSurname(request.getLastName());
        ticket.setIsAmadeus(amadeusValue);
        ticket.setUserAbm(request.getUserAbm() != null ? request.getUserAbm() : "MODIFICADOR_ABM");
        ticketRepository.save(ticket);

        segmentRepository.deleteByTicketId(ticketId);

        int goCount = 0;
        int returnCount = 0;

        List<CreatePnrRequest.SegmentDto> segments = request.getSegments();
        List<String> statuses = request.getStatuses();

        for (int i = 0; i < segments.size(); i++) {

            CreatePnrRequest.SegmentDto segDto = segments.get(i);
            if (segDto.getFlight() == null || segDto.getFlight().isEmpty()) continue;

            String direction = segDto.getDirection();
            int sequence;
            if ("GO".equals(direction)) {
                goCount++;
                sequence = goCount;
            } else {
                returnCount++;
                sequence = returnCount;
            }

            String currentStatus = (statuses != null && i < statuses.size()) ? statuses.get(i) : "FREE_TO_USE";

            String apiString = PnrUtils.generateApiString(
                request.getPnr(),
                segDto.getFlight(),
                segDto.getClazz(),  // ← CAMBIADO
                segDto.getDate(),
                segDto.getFrom(),
                segDto.getTo(),
                segDto.getRerouting(),
                segDto.getType(),
                request.getLastName()
            );

            String invoicedValue = request.getIsInvoiced() != null && request.getIsInvoiced() ? "YES" : "NOT";

            PnrSegment segment = PnrSegment.builder()
                    .ticket(ticket)
                    .direction(direction)
                    .sequence(sequence)
                    .flight(segDto.getFlight())
                    .originFrom(segDto.getFrom())
                    .destinationTo(segDto.getTo())
                    .date(segDto.getDate())
                    .time(segDto.getTime())
                    .arrivalTime(segDto.getArrivalTime())
                    .flightClass(segDto.getClazz())
                    .rerouting(segDto.getRerouting())
                    .isInvoiced(invoicedValue)
                    .exportData(apiString)
                    .status(SegmentStatus.valueOf(currentStatus))
                    .build();

            segmentRepository.save(segment);

        }

    }

}
