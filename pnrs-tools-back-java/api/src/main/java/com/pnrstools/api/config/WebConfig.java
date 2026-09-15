package com.pnrstools.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins}")
    private String corsAllowedOrigins;

    @Value("${security.allowed-ips}")
    private String allowedIps;

    @Value("${local.ip:localhost}")
    private String localIp;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        
        String[] origins = corsAllowedOrigins.split(",");
        registry.addMapping("/**")
                .allowedOrigins(origins)
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(true);

    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        Set<String> allowedIpSet = new HashSet<>();
        allowedIpSet.add("127.0.0.1");
        allowedIpSet.add("::1");
        allowedIpSet.add("::ffff:127.0.0.1");
        allowedIpSet.add(localIp);
        allowedIpSet.addAll(Arrays.asList(allowedIps.split(",")));

        registry.addInterceptor(new IpWhitelistInterceptor(allowedIpSet));

    }

}
