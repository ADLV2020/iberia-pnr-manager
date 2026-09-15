package com.pnrstools.api.repositories;

import com.pnrstools.api.model.PnrTicket;
import com.pnrstools.api.model.enums.FlightType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PnrTicketRepository extends JpaRepository<PnrTicket, Long> {

    List<PnrTicket> findByFlightTypeOrderByIdDesc(FlightType flightType);
    List<PnrTicket> findByPnr(String pnr);

}
