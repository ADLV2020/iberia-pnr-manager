
---

# 📄 **wizard.md**

```markdown
# 🧙 Wizard - Guía para Extender el Proyecto

> Este documento está diseñado para ser utilizado por cualquier IA (como yo) para entender rápidamente la arquitectura del proyecto y saber cómo extenderlo correctamente.

## 📋 Estado Actual del Proyecto

### ✅ Completado
- [x] Migración completa de TypeScript/Express a Java/Spring Boot
- [x] Configuración de Maven con Java 17 y Lombok
- [x] Modelos JPA para `PnrTicket` y `PnrSegment`
- [x] Repositorios Spring Data JPA
- [x] Servicios: `PnrService`, `SoapService`, `NdcRoundTripService`, `IberiaBookingService`
- [x] Controladores: `PnrController`, `NdcController`
- [x] Configuración CORS e IP Whitelist
- [x] Swagger/OpenAPI para documentación
- [x] Manejo global de excepciones
- [x] Base de datos SQLite con migraciones automáticas

### 🏗️ Arquitectura General
┌─────────────────────────────────────────────────────────────────┐
│ Spring Boot 3.4.4                                               │
├─────────────────────────────────────────────────────────────────┤
│ Controladores (Controllers)                                     │
│ ├── PnrController - Gestión de PNRs y disrupciones              │
│ └── NdcController - Reservas NDC Round-Trip                     │
├─────────────────────────────────────────────────────────────────┤
│ Servicios (Services)                                            │
│ ├── PnrService - CRUD de PNRs y Segmentos                       │
│ ├── SoapService - Cliente SOAP para disrupciones                │
│ ├── SoapEnvelopeFactory - Fábrica de envelopes SOAP             │
│ ├── NdcRoundTripService - Creación de reservas NDC              │
│ └── IberiaBookingService - Flujo completo NDC (WIP)             │
├─────────────────────────────────────────────────────────────────┤
│ Repositorios (Repositories) - Spring Data JPA                   │
│ ├── PnrTicketRepository                                         │
│ └── PnrSegmentRepository                                        │
├─────────────────────────────────────────────────────────────────┤
│ Modelos (Models) - JPA Entities                                 │
│ ├── PnrTicket - Tabla pnr_tickets                               │
│ └── PnrSegment - Tabla pnr_segments                             │
├─────────────────────────────────────────────────────────────────┤
│ DTOs (Data Transfer Objects)                                    │
│ ├── CreatePnrRequest                                            │
│ ├── UpdatePnrRequest                                            │
│ ├── PnrRecordResponse                                           │
│ └── CreateNdcRoundTripDto                                       │
├─────────────────────────────────────────────────────────────────┤
│ Base de Datos: SQLite (./data/pnrs_database.db)                 │
└─────────────────────────────────────────────────────────────────┘

## 🆕 Cómo Agregar un Nuevo Page (Página/Endpoint)

### 1. Crear el DTO de Request/Response

**Ubicación:** `src/main/java/com/pnrstools/api/model/dto/`

```java
// Ejemplo: CreateMyFeatureRequest.java
package com.pnrstools.api.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMyFeatureRequest {
    private String field1;
    private Integer field2;
    private Boolean active;
}
```

### 2. Crear el Servicio
**Ubicación:** `src/main/java/com/pnrstools/api/services/`

// Ejemplo: MyFeatureService.java
```java
package com.pnrstools.api.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MyFeatureService {

    // Inyectar repositorios necesarios
    // private final MyRepository repository;

    @Transactional
    public String executeFeature(CreateMyFeatureRequest request) {
        log.info("Ejecutando feature con: {}", request);
        // Lógica de negocio aquí
        return "Resultado del feature";
    }
}
```

### 3. Crear el Controlador

**Ubicación:** `src/main/java/com/pnrstools/api/controllers/`

```java
// Ejemplo: MyFeatureController.java
package com.pnrstools.api.controllers;

import com.pnrstools.api.model.dto.CreateMyFeatureRequest;
import com.pnrstools.api.services.MyFeatureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/my-feature")
@RequiredArgsConstructor
@Tag(name = "My Feature", description = "API para mi nueva funcionalidad")
public class MyFeatureController {

    private final MyFeatureService myFeatureService;

    @Operation(summary = "Ejecuta la funcionalidad")
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> execute(@RequestBody CreateMyFeatureRequest request) {
        try {
            String result = myFeatureService.executeFeature(request);
            Map<String, Object> response = new HashMap<>();
            response.put("status", "SUCCESS");
            response.put("message", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "ERROR");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
```


# 🆕 Cómo Agregar un Nuevo Step (Paso en un Flujo)

## 1. Definir el DTO del Step

*Ubicación:* `src/main/java/com/pnrstools/api/model/dto/`

```java
// Ejemplo: ProcessStepDto.java
package com.pnrstools.api.model.dto;

import lombok.Data;

@Data
public class ProcessStepDto {
    private String stepName;
    private String status;
    private String message;
    private Object data;
}
```

## 2. Crear el Servicio del Step

*Ubicación:* `src/main/java/com/pnrstools/api/services/`

```java
// Ejemplo: StepProcessorService.java
package com.pnrstools.api.services;

import com.pnrstools.api.model.dto.ProcessStepDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StepProcessorService {

    private final List<ProcessStepDto> steps = new ArrayList<>();

    public ProcessStepDto executeStep(String stepName, Object input) {
        ProcessStepDto step = new ProcessStepDto();
        step.setStepName(stepName);
        step.setStatus("IN_PROGRESS");

        try {
            log.info("Ejecutando step: {} con input: {}", stepName, input);

            // Lógica del paso aquí
            step.setStatus("COMPLETED");
            step.setMessage("Paso completado exitosamente");
            step.setData("Resultado del paso");

            steps.add(step);
            return step;
        } catch (Exception e) {
            step.setStatus("FAILED");
            step.setMessage(e.getMessage());
            log.error("Error en step {}: {}", stepName, e.getMessage());
            return step;
        }
    }

    public List<ProcessStepDto> getSteps() {
        return new ArrayList<>(steps);
    }

    public void clearSteps() {
        steps.clear();
    }
}
```

## 3. Controlador con Streaming de Steps

```java
// Ejemplo: StepController.java
package com.pnrstools.api.controllers;

import com.pnrstools.api.services.StepProcessorService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/steps")
@RequiredArgsConstructor
public class StepController {

    private final StepProcessorService stepService;

    @Operation(summary = "Ejecuta un proceso con streaming de steps")
    @PostMapping(value = "/process-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter processWithStream(@RequestBody Map<String, Object> input) {
        SseEmitter emitter = new SseEmitter(120000L);
        ExecutorService executor = Executors.newSingleThreadExecutor();

        executor.execute(() -> {
            try {
                // Step 1
                emitter.send(SseEmitter.event().name("step").data(
                    stepService.executeStep("STEP_1", input)
                ));
                Thread.sleep(500);

                // Step 2
                emitter.send(SseEmitter.event().name("step").data(
                    stepService.executeStep("STEP_2", input)
                ));
                Thread.sleep(500);

                // Step 3 - Final
                emitter.send(SseEmitter.event().name("complete").data(
                    Map.of("status", "COMPLETED", "steps", stepService.getSteps())
                ));
                emitter.complete();

                stepService.clearSteps();
            } catch (Exception e) {
                try {
                    emitter.send(SseEmitter.event().name("error").data(
                        Map.of("message", e.getMessage())
                    ));
                } catch (IOException ignored) {}
                emitter.completeWithError(e);
            }
        });

        executor.shutdown();
        return emitter;
    }
}
```


# 🆕 Cómo Agregar una Nueva Factory

## 1. Crear la Interface de Estrategia

*Ubicación:* `src/main/java/com/pnrstools/api/strategy/`

```java
// Ejemplo: IStrategy.java
package com.pnrstools.api.strategy;

public interface IStrategy<T, R> {
    R execute(T input);
    String getType();
}
```

## 2. Crear las Implementaciones

```java
// Ejemplo: StrategyA.java
package com.pnrstools.api.strategy.impl;

import com.pnrstools.api.strategy.IStrategy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class StrategyA implements IStrategy<String, String> {

    @Override
    public String execute(String input) {
        log.info("StrategyA ejecutando con: {}", input);
        return "Resultado de StrategyA: " + input.toUpperCase();
    }

    @Override
    public String getType() {
        return "TYPE_A";
    }
}
```

```java
// Ejemplo: StrategyB.java
package com.pnrstools.api.strategy.impl;

import com.pnrstools.api.strategy.IStrategy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class StrategyB implements IStrategy<String, String> {

    @Override
    public String execute(String input) {
        log.info("StrategyB ejecutando con: {}", input);
        return "Resultado de StrategyB: " + input.toLowerCase();
    }

    @Override
    public String getType() {
        return "TYPE_B";
    }
}
```

## 3. Crear la Factory

*Ubicación:* `src/main/java/com/pnrstools/api/factory/`

```java
// Ejemplo: StrategyFactory.java
package com.pnrstools.api.factory;

import com.pnrstools.api.strategy.IStrategy;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StrategyFactory {

    private final Map<String, IStrategy<String, String>> strategies = new ConcurrentHashMap<>();

    public StrategyFactory(List<IStrategy<String, String>> strategyList) {
        for (IStrategy<String, String> strategy : strategyList) {
            strategies.put(strategy.getType(), strategy);
        }
    }

    public IStrategy<String, String> getStrategy(String type) {
        IStrategy<String, String> strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("Estrategia no encontrada para tipo: " + type);
        }
        return strategy;
    }

    public String execute(String type, String input) {
        return getStrategy(type).execute(input);
    }
}
```

## 4. Usar la Factory en un Servicio

```java
// Ejemplo: StrategyService.java
package com.pnrstools.api.services;

import com.pnrstools.api.factory.StrategyFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class StrategyService {

    private final StrategyFactory strategyFactory;

    public String process(String type, String input) {
        log.info("Procesando con tipo: {} y input: {}", type, input);
        return strategyFactory.execute(type, input);
    }
}
```

# 🆕 Cómo Agregar un Nuevo Endpoint SOAP

## 1. Extender el Factory de Envelopes

*Ubicación:* `src/main/java/com/pnrstools/api/services/SoapEnvelopeFactory.java`

```java
// Agregar nuevo tipo de disrupción
public enum DisruptionType {
    UN,
    UNTK,
    FLCH,
    NUEVO_TIPO  // ← Agregar aquí
}

// Agregar nueva estrategia de envelope
private String buildNuevoTipoEnvelope(DisruptionData data) {
    // Construir el XML SOAP específico
    return """
        <soapenv:Envelope ...>
            <!-- XML específico para el nuevo tipo -->
        </soapenv:Envelope>
        """.formatted(...);
}

// Agregar al switch en getEnvelope()
public String getEnvelope(DisruptionData data) {
    return switch (data.disruptionType()) {
        case UN -> buildUnEnvelope(data);
        case UNTK -> buildUntkEnvelope(data);
        case FLCH -> buildFlchEnvelope(data);
        case NUEVO_TIPO -> buildNuevoTipoEnvelope(data);  // ← Agregar aquí
        default -> throw new IllegalArgumentException("Tipo no soportado");
    };
}
```

## 2. Agregar el Endpoint en el Controlador

```java
// En PnrController.java
@Operation(summary = "Disrupción NUEVO_TIPO")
@PostMapping("/disruption/nuevo-tipo")
public ResponseEntity<Map<String, Object>> disruptionNuevoTipo(@RequestBody Map<String, Object> payload) {
    payload.put("disruptionType", "NUEVO_TIPO");
    return triggerSoapDisruption(payload);
}
```

# 📋 Checklist para Nuevas Features

□ DTOs: Crear en model/dto/ con @Data, @Builder, @NoArgsConstructor, @AllArgsConstructor
□ Servicio: Crear en services/ con @Service, @RequiredArgsConstructor, @Slf4j
□ Controlador: Crear en controllers/ con @RestController, @RequestMapping, @Tag
□ Swagger: Agregar @Operation a cada endpoint
□ Excepciones: Usar GlobalExceptionHandler para manejar errores
□ Logging: Usar log.info(), log.error() con @Slf4j
□ Transacciones: Usar @Transactional en servicios que modifican BD
□ Tests: Crear tests unitarios en src/test/java/


# 🧪 Patrones de Diseño Usados

| Patrón               | Uso                               | Ejemplo                                     | 
|----------------------|-----------------------------------|---------------------------------------------|
| Factory Pattern      | Creación de envelopes SOAP        | SoapEnvelopeFactory                         | 
| Strategy Pattern     | Diferentes tipos de disrupción	   | Estrategias en SoapEnvelopeFactory          | 
| Repository Pattern   | Acceso a datos                    | PnrTicketRepository, PnrSegmentRepository   | 
| DTO Pattern          | Transferencia de datos            | CreatePnrRequest, PnrRecordResponse         | 
| Builder Pattern      | Construcción de objetos complejos | @Builder en modelos y DTOs                  | 
| Dependency Injection | Inyección de dependencias         | @RequiredArgsConstructor                    | 
| Exception Handler    | Manejo global de errores          | GlobalExceptionHandler                      | 


# 📚 Dónde Buscar Ayuda

Spring Boot Documentation: https://docs.spring.io/spring-boot/docs/current/reference/html/
Spring Data JPA: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/
Lombok Reference: https://projectlombok.org/features/
Swagger/OpenAPI: https://springdoc.org/
SQLite JDBC: https://github.com/xerial/sqlite-jdbc


# ⚡ Comandos Rápidos para Desarrollo

```bash
# Compilar
.\mvnw compile

# Ejecutar
.\mvnw spring-boot:run

# Empaquetar
.\mvnw package

# Ver Swagger
# http://localhost:3000/swagger-ui/index.html
```
