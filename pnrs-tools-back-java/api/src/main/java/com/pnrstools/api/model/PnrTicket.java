package com.pnrstools.api.model;

import com.pnrstools.api.model.enums.FlightType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pnr_tickets")
public class PnrTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flight_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private FlightType flightType;

    @Column(name = "pnr", nullable = false)
    private String pnr;

    @Column(name = "surname", nullable = false)
    private String surname;

    @Column(name = "is_amadeus", columnDefinition = "TEXT DEFAULT 'NOT'")
    private String isAmadeus;

    @Column(name = "user_creation")
    private String userCreation;

    @Column(name = "user_abm")
    private String userAbm;

    @Column(name = "mocked_at_int")
    private LocalDateTime mockedAtInt;

    @Column(name = "mocked_at_pre")
    private LocalDateTime mockedAtPre;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @OrderBy("direction DESC, sequence ASC")
    private List<PnrSegment> segments = new ArrayList<>();

    // Constructor vacío (requerido por JPA)
    public PnrTicket() {}

    // Constructor con todos los campos (para builder manual)
    public PnrTicket(Long id, FlightType flightType, String pnr, String surname, String isAmadeus, 
                     String userCreation, String userAbm, LocalDateTime mockedAtInt, 
                     LocalDateTime mockedAtPre, LocalDateTime createdAt, List<PnrSegment> segments) {
        this.id = id;
        this.flightType = flightType;
        this.pnr = pnr;
        this.surname = surname;
        this.isAmadeus = isAmadeus;
        this.userCreation = userCreation;
        this.userAbm = userAbm;
        this.mockedAtInt = mockedAtInt;
        this.mockedAtPre = mockedAtPre;
        this.createdAt = createdAt;
        this.segments = segments;
    }

    // === GETTERS Y SETTERS ===
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public FlightType getFlightType() { return flightType; }
    public void setFlightType(FlightType flightType) { this.flightType = flightType; }

    public String getPnr() { return pnr; }
    public void setPnr(String pnr) { this.pnr = pnr; }

    public String getSurname() { return surname; }
    public void setSurname(String surname) { this.surname = surname; }

    public String getIsAmadeus() { return isAmadeus; }
    public void setIsAmadeus(String isAmadeus) { this.isAmadeus = isAmadeus; }

    public String getUserCreation() { return userCreation; }
    public void setUserCreation(String userCreation) { this.userCreation = userCreation; }

    public String getUserAbm() { return userAbm; }
    public void setUserAbm(String userAbm) { this.userAbm = userAbm; }

    public LocalDateTime getMockedAtInt() { return mockedAtInt; }
    public void setMockedAtInt(LocalDateTime mockedAtInt) { this.mockedAtInt = mockedAtInt; }

    public LocalDateTime getMockedAtPre() { return mockedAtPre; }
    public void setMockedAtPre(LocalDateTime mockedAtPre) { this.mockedAtPre = mockedAtPre; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<PnrSegment> getSegments() { return segments; }
    public void setSegments(List<PnrSegment> segments) { this.segments = segments; }

    // === BUILDER MANUAL ===
    public static PnrTicketBuilder builder() {
        return new PnrTicketBuilder();
    }

    public static class PnrTicketBuilder {
        private Long id;
        private FlightType flightType;
        private String pnr;
        private String surname;
        private String isAmadeus;
        private String userCreation;
        private String userAbm;
        private LocalDateTime mockedAtInt;
        private LocalDateTime mockedAtPre;
        private LocalDateTime createdAt;
        private List<PnrSegment> segments = new ArrayList<>();

        public PnrTicketBuilder id(Long id) { this.id = id; return this; }
        public PnrTicketBuilder flightType(FlightType flightType) { this.flightType = flightType; return this; }
        public PnrTicketBuilder pnr(String pnr) { this.pnr = pnr; return this; }
        public PnrTicketBuilder surname(String surname) { this.surname = surname; return this; }
        public PnrTicketBuilder isAmadeus(String isAmadeus) { this.isAmadeus = isAmadeus; return this; }
        public PnrTicketBuilder userCreation(String userCreation) { this.userCreation = userCreation; return this; }
        public PnrTicketBuilder userAbm(String userAbm) { this.userAbm = userAbm; return this; }
        public PnrTicketBuilder mockedAtInt(LocalDateTime mockedAtInt) { this.mockedAtInt = mockedAtInt; return this; }
        public PnrTicketBuilder mockedAtPre(LocalDateTime mockedAtPre) { this.mockedAtPre = mockedAtPre; return this; }
        public PnrTicketBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public PnrTicketBuilder segments(List<PnrSegment> segments) { this.segments = segments; return this; }

        public PnrTicket build() {
            return new PnrTicket(id, flightType, pnr, surname, isAmadeus, userCreation, userAbm, 
                                mockedAtInt, mockedAtPre, createdAt, segments);
        }
    }

}
