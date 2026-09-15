package com.pnrstools.api.repositories;

import com.pnrstools.api.model.PnrSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PnrSegmentRepository extends JpaRepository<PnrSegment, Long> {

    List<PnrSegment> findByTicketIdOrderByDirectionDescSequenceAsc(Long ticketId);
    void deleteByTicketId(Long ticketId);
    
}
