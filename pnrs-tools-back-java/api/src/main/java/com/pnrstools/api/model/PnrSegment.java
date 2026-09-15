package com.pnrstools.api.model;

import com.pnrstools.api.model.enums.DisruptionType;
import com.pnrstools.api.model.enums.SegmentStatus;
import jakarta.persistence.*;

@Entity
@Table(name = "pnr_segments")
public class PnrSegment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private PnrTicket ticket;

    @Column(name = "direction", nullable = false)
    private String direction;

    @Column(name = "sequence", nullable = false)
    private Integer sequence;

    @Column(name = "flight", nullable = false)
    private String flight;

    @Column(name = "origin_from", nullable = false)
    private String originFrom;

    @Column(name = "destination_to", nullable = false)
    private String destinationTo;

    @Column(name = "date", nullable = false)
    private String date;

    @Column(name = "time")
    private String time;

    @Column(name = "arrival_time")
    private String arrivalTime;

    @Column(name = "flight_class")
    private String flightClass;

    @Column(name = "rerouting")
    private String rerouting;

    @Column(name = "disruption_type")
    @Enumerated(EnumType.STRING)
    private DisruptionType disruptionType;

    @Column(name = "schedule_change_type")
    private String scheduleChangeType;

    @Column(name = "is_invoiced", columnDefinition = "TEXT DEFAULT 'NOT'")
    private String isInvoiced;

    @Column(name = "export_data")
    private String exportData;

    @Column(name = "status", columnDefinition = "TEXT DEFAULT 'FREE_TO_USE'")
    @Enumerated(EnumType.STRING)
    private SegmentStatus status;

    // Constructor vacío
    public PnrSegment() {}

    // Constructor con todos los campos
    public PnrSegment(Long id, PnrTicket ticket, String direction, Integer sequence, String flight,
                      String originFrom, String destinationTo, String date, String time, String arrivalTime,
                      String flightClass, String rerouting, DisruptionType disruptionType,
                      String scheduleChangeType, String isInvoiced, String exportData, SegmentStatus status) {
        this.id = id;
        this.ticket = ticket;
        this.direction = direction;
        this.sequence = sequence;
        this.flight = flight;
        this.originFrom = originFrom;
        this.destinationTo = destinationTo;
        this.date = date;
        this.time = time;
        this.arrivalTime = arrivalTime;
        this.flightClass = flightClass;
        this.rerouting = rerouting;
        this.disruptionType = disruptionType;
        this.scheduleChangeType = scheduleChangeType;
        this.isInvoiced = isInvoiced;
        this.exportData = exportData;
        this.status = status;
    }

    // === GETTERS Y SETTERS ===
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PnrTicket getTicket() { return ticket; }
    public void setTicket(PnrTicket ticket) { this.ticket = ticket; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }

    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }

    public String getFlight() { return flight; }
    public void setFlight(String flight) { this.flight = flight; }

    public String getOriginFrom() { return originFrom; }
    public void setOriginFrom(String originFrom) { this.originFrom = originFrom; }

    public String getDestinationTo() { return destinationTo; }
    public void setDestinationTo(String destinationTo) { this.destinationTo = destinationTo; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getArrivalTime() { return arrivalTime; }
    public void setArrivalTime(String arrivalTime) { this.arrivalTime = arrivalTime; }

    public String getFlightClass() { return flightClass; }
    public void setFlightClass(String flightClass) { this.flightClass = flightClass; }

    public String getRerouting() { return rerouting; }
    public void setRerouting(String rerouting) { this.rerouting = rerouting; }

    public DisruptionType getDisruptionType() { return disruptionType; }
    public void setDisruptionType(DisruptionType disruptionType) { this.disruptionType = disruptionType; }

    public String getScheduleChangeType() { return scheduleChangeType; }
    public void setScheduleChangeType(String scheduleChangeType) { this.scheduleChangeType = scheduleChangeType; }

    public String getIsInvoiced() { return isInvoiced; }
    public void setIsInvoiced(String isInvoiced) { this.isInvoiced = isInvoiced; }

    public String getExportData() { return exportData; }
    public void setExportData(String exportData) { this.exportData = exportData; }

    public SegmentStatus getStatus() { return status; }
    public void setStatus(SegmentStatus status) { this.status = status; }

    // === BUILDER MANUAL ===
    public static PnrSegmentBuilder builder() {
        return new PnrSegmentBuilder();
    }

    public static class PnrSegmentBuilder {
        private Long id;
        private PnrTicket ticket;
        private String direction;
        private Integer sequence;
        private String flight;
        private String originFrom;
        private String destinationTo;
        private String date;
        private String time;
        private String arrivalTime;
        private String flightClass;
        private String rerouting;
        private DisruptionType disruptionType;
        private String scheduleChangeType;
        private String isInvoiced;
        private String exportData;
        private SegmentStatus status;

        public PnrSegmentBuilder id(Long id) { this.id = id; return this; }
        public PnrSegmentBuilder ticket(PnrTicket ticket) { this.ticket = ticket; return this; }
        public PnrSegmentBuilder direction(String direction) { this.direction = direction; return this; }
        public PnrSegmentBuilder sequence(Integer sequence) { this.sequence = sequence; return this; }
        public PnrSegmentBuilder flight(String flight) { this.flight = flight; return this; }
        public PnrSegmentBuilder originFrom(String originFrom) { this.originFrom = originFrom; return this; }
        public PnrSegmentBuilder destinationTo(String destinationTo) { this.destinationTo = destinationTo; return this; }
        public PnrSegmentBuilder date(String date) { this.date = date; return this; }
        public PnrSegmentBuilder time(String time) { this.time = time; return this; }
        public PnrSegmentBuilder arrivalTime(String arrivalTime) { this.arrivalTime = arrivalTime; return this; }
        public PnrSegmentBuilder flightClass(String flightClass) { this.flightClass = flightClass; return this; }
        public PnrSegmentBuilder rerouting(String rerouting) { this.rerouting = rerouting; return this; }
        public PnrSegmentBuilder disruptionType(DisruptionType disruptionType) { this.disruptionType = disruptionType; return this; }
        public PnrSegmentBuilder scheduleChangeType(String scheduleChangeType) { this.scheduleChangeType = scheduleChangeType; return this; }
        public PnrSegmentBuilder isInvoiced(String isInvoiced) { this.isInvoiced = isInvoiced; return this; }
        public PnrSegmentBuilder exportData(String exportData) { this.exportData = exportData; return this; }
        public PnrSegmentBuilder status(SegmentStatus status) { this.status = status; return this; }

        public PnrSegment build() {
            return new PnrSegment(id, ticket, direction, sequence, flight, originFrom, destinationTo,
                                  date, time, arrivalTime, flightClass, rerouting, disruptionType,
                                  scheduleChangeType, isInvoiced, exportData, status);
        }
    }

}
