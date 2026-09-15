package com.pnrstools.api.services;

import com.pnrstools.api.model.enums.DisruptionType;
import org.springframework.stereotype.Component;

@Component
public class SoapEnvelopeFactory {

    public record DisruptionData(
            String pnr,
            String surname,
            String flight,
            String flightClass,
            String date, // DDMMYYYY
            String origin,
            String destination,
            String alternative,
            DisruptionType disruptionType
    ) {}

    private String formatDateToIso(String ddmmaaaa) {
        if (ddmmaaaa == null || ddmmaaaa.length() != 8) return "";
        return ddmmaaaa.substring(4, 8) + "-" + ddmmaaaa.substring(2, 4) + "-" + ddmmaaaa.substring(0, 2);
    }

    public String getEnvelope(DisruptionData data) {
        return switch (data.disruptionType()) {
            case UN -> buildUnEnvelope(data);
            case UNTK -> buildUntkEnvelope(data);
            case FLCH -> buildFlchEnvelope(data);
            default -> throw new IllegalArgumentException("Tipo de disrupción no soportado: " + data.disruptionType());
        };
    }

    private String buildUnEnvelope(DisruptionData data) {
        String isoDate = formatDateToIso(data.date());
        return """
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:reac="http://Reaccom_Admin.svc">
               <soapenv:Header/>
               <soapenv:Body>
                  <reac:DisruptionIB>
                     <reac:RequestDisrupt>
                        <reac:PNR>%s</reac:PNR>
                        <reac:DisruptedFlightsUN>
                           <reac:vueloUB>
                              <reac:Origen>%s</reac:Origen>
                              <reac:Destino>%s</reac:Destino>
                              <reac:Linea>IB</reac:Linea>
                              <reac:Vuelo>%s</reac:Vuelo>
                              <reac:Clase>%s</reac:Clase>
                              <reac:Fecha>%sT00:00:00</reac:Fecha>
                              <reac:Cancelado>false</reac:Cancelado>
                           </reac:vueloUB>
                        </reac:DisruptedFlightsUN>
                     </reac:RequestDisrupt>
                  </reac:DisruptionIB>
               </soapenv:Body>
            </soapenv:Envelope>
            """.formatted(
                data.pnr(),
                data.origin(),
                data.destination(),
                data.flight(),
                data.flightClass(),
                isoDate
        ).trim();
    }

    private String buildUntkEnvelope(DisruptionData data) {
        String isoDate = formatDateToIso(data.date());
        return """
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:reac="http://Reaccom_Admin.svc">
               <soapenv:Header />
               <soapenv:Body>
                  <reac:DisruptionIB>
                     <reac:RequestDisrupt>
                        <reac:PNR>%s</reac:PNR>
                        <reac:DisruptedGroupsUNTK>
                           <reac:DisruptionGroup>
                              <reac:DisruptedFlights>
                                 <reac:vueloUB>
                                    <reac:Origen>%s</reac:Origen>
                                    <reac:Destino>%s</reac:Destino>
                                    <reac:Linea>IB</reac:Linea>
                                    <reac:Vuelo>%s</reac:Vuelo>
                                    <reac:Clase>%s</reac:Clase>
                                    <reac:Fecha>%sT00:00:00</reac:Fecha>
                                    <reac:Cancelado>false</reac:Cancelado>
                                 </reac:vueloUB>
                              </reac:DisruptedFlights>
                              <reac:NewFlights>
                                 <reac:vueloUB>
                                    <reac:Origen>%s</reac:Origen>
                                    <reac:Destino>%s</reac:Destino>
                                    <reac:Linea>IB</reac:Linea>
                                    <reac:Vuelo>%s</reac:Vuelo>
                                    <reac:Clase>%s</reac:Clase>
                                    <reac:Fecha>%sT00:00:00</reac:Fecha>
                                    <reac:Cancelado>false</reac:Cancelado>
                                 </reac:vueloUB>
                              </reac:NewFlights>
                           </reac:DisruptionGroup>
                        </reac:DisruptedGroupsUNTK>
                     </reac:RequestDisrupt>
                  </reac:DisruptionIB>
               </soapenv:Body>
            </soapenv:Envelope>
            """.formatted(
                data.pnr(),
                data.origin(),
                data.destination(),
                data.flight(),
                data.flightClass(),
                isoDate,
                data.origin(),
                data.destination(),
                data.alternative() != null ? data.alternative() : "",
                data.flightClass(),
                isoDate
        ).trim();
    }

    private String buildFlchEnvelope(DisruptionData data) {
        String isoDate = formatDateToIso(data.date());
        return """
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:reac="http://Reaccom_Admin.svc">
               <soapenv:Header/>
               <soapenv:Body>
                  <reac:DisruptionIB>
                     <reac:RequestDisrupt>
                        <reac:PNR>%s</reac:PNR>
                        <reac:DisruptedGroupsUNTK>
                           <reac:DisruptionGroup>
                              <reac:DisruptedFlights>
                                 <reac:vueloUB>
                                    <reac:Origen>%s</reac:Origen>
                                    <reac:Destino>%s</reac:Destino>
                                    <reac:Linea>IB</reac:Linea>
                                    <reac:Vuelo>%s</reac:Vuelo>
                                    <reac:Clase>%s</reac:Clase>
                                    <reac:Fecha>%sT00:00:00</reac:Fecha>
                                    <reac:Cancelado>false</reac:Cancelado>
                                 </reac:vueloUB>
                              </reac:DisruptedFlights>
                              <reac:NewFlights>
                                 <reac:vueloUB>
                                    <reac:Origen>%s</reac:Origen>
                                    <reac:Destino>%s</reac:Destino>
                                    <reac:Linea>IB</reac:Linea>
                                    <reac:Vuelo>%s</reac:Vuelo>
                                    <reac:Clase>%s</reac:Clase>
                                    <reac:Fecha>%sT00:00:00</reac:Fecha>
                                    <reac:Cancelado>false</reac:Cancelado>
                                 </reac:vueloUB>
                              </reac:NewFlights>
                              <reac:CheckinWindow>true</reac:CheckinWindow>
                           </reac:DisruptionGroup>
                        </reac:DisruptedGroupsUNTK>
                     </reac:RequestDisrupt>
                  </reac:DisruptionIB>
               </soapenv:Body>
            </soapenv:Envelope>
            """.formatted(
                data.pnr(),
                data.origin(),
                data.destination(),
                data.flight(),
                data.flightClass(),
                isoDate,
                data.origin(),
                data.destination(),
                data.alternative() != null ? data.alternative() : "",
                data.flightClass(),
                isoDate
        ).trim();
    }
}