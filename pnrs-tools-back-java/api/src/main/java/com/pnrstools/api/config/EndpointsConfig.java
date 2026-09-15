package com.pnrstools.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "endpoints")
public class EndpointsConfig {
    
    private String mockInt;
    private String mockPre;
    private String soapDisruption;
    private String soapAction;

}
