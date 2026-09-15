package com.pnrstools.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        
        return new OpenAPI()
                .info(new Info()
                        .title("API de Automatización de PNRs - Iberia NDC")
                        .version("2.0.0")
                        .description("Portal de desarrollo para la inyección de disrupciones y generación automática de flujos de compra en entornos PRE e INT.")
                        .contact(new Contact()
                                .name("PNRs Tools Team")
                                .email("pnrstools@iberia.com")));

    }

}
