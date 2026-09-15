package com.pnrstools.api.model.dto;

import java.util.List;

public class CreateNdcRoundTripDto {
    private String origin;
    private String destination;
    private String outboundDate;
    private String inboundDate;
    private List<PassengerCountDto> passengers;
    private List<PassengerInfoDto> passengerDetails;
    private String emailContact;
    private String phoneContact;
    private String marketCode;
    private String preferredCabin;

    // Constructor vacío
    public CreateNdcRoundTripDto() {}

    // Constructor completo
    public CreateNdcRoundTripDto(String origin, String destination, String outboundDate, String inboundDate,
                                 List<PassengerCountDto> passengers, List<PassengerInfoDto> passengerDetails,
                                 String emailContact, String phoneContact, String marketCode, String preferredCabin) {
        this.origin = origin;
        this.destination = destination;
        this.outboundDate = outboundDate;
        this.inboundDate = inboundDate;
        this.passengers = passengers;
        this.passengerDetails = passengerDetails;
        this.emailContact = emailContact;
        this.phoneContact = phoneContact;
        this.marketCode = marketCode;
        this.preferredCabin = preferredCabin;
    }

    // Getters y Setters
    public String getOrigin() { return origin; }
    public void setOrigin(String origin) { this.origin = origin; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getOutboundDate() { return outboundDate; }
    public void setOutboundDate(String outboundDate) { this.outboundDate = outboundDate; }

    public String getInboundDate() { return inboundDate; }
    public void setInboundDate(String inboundDate) { this.inboundDate = inboundDate; }

    public List<PassengerCountDto> getPassengers() { return passengers; }
    public void setPassengers(List<PassengerCountDto> passengers) { this.passengers = passengers; }

    public List<PassengerInfoDto> getPassengerDetails() { return passengerDetails; }
    public void setPassengerDetails(List<PassengerInfoDto> passengerDetails) { this.passengerDetails = passengerDetails; }

    public String getEmailContact() { return emailContact; }
    public void setEmailContact(String emailContact) { this.emailContact = emailContact; }

    public String getPhoneContact() { return phoneContact; }
    public void setPhoneContact(String phoneContact) { this.phoneContact = phoneContact; }

    public String getMarketCode() { return marketCode; }
    public void setMarketCode(String marketCode) { this.marketCode = marketCode; }

    public String getPreferredCabin() { return preferredCabin; }
    public void setPreferredCabin(String preferredCabin) { this.preferredCabin = preferredCabin; }

    // === INNER CLASS PassengerCountDto ===
    public static class PassengerCountDto {
        private String passengerType;
        private Integer count;

        public PassengerCountDto() {}
        public PassengerCountDto(String passengerType, Integer count) {
            this.passengerType = passengerType;
            this.count = count;
        }

        public String getPassengerType() { return passengerType; }
        public void setPassengerType(String passengerType) { this.passengerType = passengerType; }

        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
    }

    // === INNER CLASS PassengerInfoDto ===
    public static class PassengerInfoDto {
        private String firstName;
        private String firstSurname;
        private String birthDate;
        private String gender;
        private String title;

        public PassengerInfoDto() {}
        public PassengerInfoDto(String firstName, String firstSurname, String birthDate, String gender, String title) {
            this.firstName = firstName;
            this.firstSurname = firstSurname;
            this.birthDate = birthDate;
            this.gender = gender;
            this.title = title;
        }

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }

        public String getFirstSurname() { return firstSurname; }
        public void setFirstSurname(String firstSurname) { this.firstSurname = firstSurname; }

        public String getBirthDate() { return birthDate; }
        public void setBirthDate(String birthDate) { this.birthDate = birthDate; }

        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
    }

}
