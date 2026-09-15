package com.pnrstools.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

public class IpWhitelistInterceptor implements HandlerInterceptor {
    private static final Logger logger = LoggerFactory.getLogger(IpWhitelistInterceptor.class);
    private final Set<String> allowedIps;

    public IpWhitelistInterceptor(Set<String> allowedIps) {
        this.allowedIps = allowedIps;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        
        String clientIp = getClientIp(request);
        String normalizedIp = clientIp.replaceFirst("^::ffff:", "");

        if (allowedIps.contains(normalizedIp) || allowedIps.contains(clientIp)) {
            return true;
        }

        logger.warn("🚨 [FIREWALL INT] Acceso denegado a IP no autorizada: {} ({} {})",
                clientIp, request.getMethod(), request.getRequestURI());

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        try {
            response.getWriter().write("{\"status\":\"FORBIDDEN\",\"message\":\"Acceso denegado. La IP [" + clientIp + "] no está autorizada.\"}");
        } catch (Exception e) {
            logger.error("Error escribiendo respuesta de forbidden", e);
        }
        return false;

    }

    private String getClientIp(HttpServletRequest request) {

        String xForwardedFor = request.getHeader("x-forwarded-for");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();

    }

}
