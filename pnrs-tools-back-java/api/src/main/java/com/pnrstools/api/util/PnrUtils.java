package com.pnrstools.api.util;

public class PnrUtils {

    public static String formatDate(String date) {
        
        if (date == null || date.length() != 8) return date;
        return date.substring(4, 8) + "-" + date.substring(2, 4) + "-" + date.substring(0, 2);

    }

    public static String formatFlight(String flight) {

        if (flight == null) return "";
        return flight.replaceAll("\\D", "")
                .replaceAll("^.{0," + Math.max(0, flight.replaceAll("\\D", "").length() - 4) + "}", "");

    }

    public static String generateApiString(String pnr, String flight, String flightClass, String date,
                                           String from, String to, String rerouting, String type, String lastName) {

        return String.join(";",
                pnr,
                formatFlight(flight),
                flightClass != null ? flightClass : "",
                formatDate(date),
                from != null ? from : "",
                to != null ? to : "",
                rerouting != null ? rerouting : "",
                type != null ? type : "",
                lastName != null ? lastName : ""
        );

    }

}
