package com.pnrstools.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class PnrsToolsApplication {
    public static void main(String[] args) {
        SpringApplication.run(PnrsToolsApplication.class, args);
        System.out.println("🚀 PNRs Tools Backend (Spring Boot) iniciado!");
    }
}
