// src/hooks/useSegments.ts

import { useState, useEffect } from 'react';
import { FlightType, Segment } from '../types/index.ts';

const createEmptySegment = (direction: 'GO' | 'RETURN' = 'GO'): Segment => ({
  direction,
  from: '',
  to: '',
  flight: '',
  class: '',
  date: '',
  time: '',
  arrivalTime: '',
  rerouting: '',
  type: '',
  isInvoiced: false,
});

export function useSegments(flightType: FlightType) {
  const [segments, setSegments] = useState<Segment[]>(() => {
    if (flightType === 'one-way' || flightType === 'connecting-one-way') {
      return [createEmptySegment('GO')];
    } else {
      return [createEmptySegment('GO'), createEmptySegment('RETURN')];
    }
  });

  // Resetear cuando cambia flightType
  useEffect(() => {
    if (flightType === 'one-way' || flightType === 'connecting-one-way') {
      setSegments([createEmptySegment('GO')]);
    } else {
      setSegments([createEmptySegment('GO'), createEmptySegment('RETURN')]);
    }
  }, [flightType]);

  const updateSegment = (index: number, field: keyof Segment, value: any) => {
    setSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSegment = (direction: 'GO' | 'RETURN') => {
    if (flightType === 'one-way' || flightType === 'round-trip') return false;
    const currentCount = segments.filter(s => s.direction === direction).length;
    if (currentCount >= 3) return false;
    const newSeg = createEmptySegment(direction);
    if (direction === 'GO') {
      const lastGoIndex = segments.map(s => s.direction).lastIndexOf('GO');
      setSegments(prev => {
        const updated = [...prev];
        updated.splice(lastGoIndex + 1, 0, newSeg);
        return updated;
      });
    } else {
      setSegments(prev => [...prev, newSeg]);
    }
    return true;
  };

  const setSegmentsFromRecord = (rawSegments: any[]) => {
    const mapped = rawSegments.map(s => ({
      direction: s.direction,
      from: s.origin_from,
      to: s.destination_to,
      flight: s.flight,
      class: s.flight_class,
      date: s.date,
      time: s.time,
      arrivalTime: s.arrival_time,
      isInvoiced: s.is_invoiced === 'YES',
      status: s.status,
      rerouting: s.rerouting,
      type: s.disruption_type,
      exportData: s.export_data,
      sequence: s.sequence,
    }));
    // Ordenar: primero GO, luego RETURN. Dentro de cada grupo, por sequence
    const sorted = [...mapped].sort((a, b) => {
      if (a.direction === b.direction) {
        return (a.sequence || 0) - (b.sequence || 0);
      }
      return a.direction === 'GO' ? -1 : 1;
    });
    setSegments(sorted);
  };

  const resetSegments = () => {
    if (flightType === 'one-way' || flightType === 'connecting-one-way') {
      setSegments([createEmptySegment('GO')]);
    } else {
      setSegments([createEmptySegment('GO'), createEmptySegment('RETURN')]);
    }
  };

  return { segments, updateSegment, addSegment, setSegmentsFromRecord, resetSegments };
  
}
