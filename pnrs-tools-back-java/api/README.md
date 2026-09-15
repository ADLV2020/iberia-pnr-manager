# PNRs Tools Backend - Spring Boot

> Migración completa del backend de PNRs Tools desde TypeScript/Express a Java/Spring Boot.

## 📋 Descripción

Este proyecto es el backend de la herramienta PNRs Tools, diseñada para la automatización de la gestión de PNRs (Passenger Name Records), inyección de disrupciones (UN, UNTK, FLCH) y generación automática de flujos de compra en entornos PRE e INT de Iberia.

La migración mantiene la misma funcionalidad que la versión original en TypeScript, pero aprovechando las ventajas de Spring Boot: mejor rendimiento, tipado fuerte, manejo de transacciones y una arquitectura más robusta y escalable.

## 🛠️ Tecnologías y Framework

| Tecnología                        | Versión  | Propósito                                                    |
|-----------------------------------|----------|--------------------------------------------------------------|
| **Java**                          | 17 (LTS) | Lenguaje base del proyecto                                   |
| **Spring Boot**                   | 3.4.4    | Framework principal (Web, JPA, Validation, Actuator)         |
| **Spring Data JPA**               | -        | ORM y manejo de base de datos                                |
| **Spring WebFlux**                | -        | Cliente HTTP reactivo para llamadas a APIs externas          |
| **SQLite**                        | 3.49.1.0 | Base de datos local (compatible con la original)             |
| **Lombok**                        | 1.18.34  | Reducción de código boilerplate (getters, setters, builders) |
| **OpenAPI / Swagger**             | 2.8.5    | Documentación interactiva de la API                          |
| **Maven**                         | -        | Gestor de dependencias y build tool                          |
| **Hibernate Community Dialects**  | -        | Soporte para SQLite con JPA                                  |

## 📁 Estructura del Proyecto

pnrs-tools-back-java/
├── pom.xml # Configuración Maven (dependencias, plugins)
├── .mvn/ # Maven Wrapper (no requiere instalación global)
├── src/
│ └── main/
│ ├── java/
│ │ └── com/
│ │ └── pnrstools/
│ │ └── api/
│ │ ├── PnrsToolsApplication.java # Clase principal
│ │ ├── config/ # Configuraciones
│ │ │ ├── EndpointsConfig.java # URLs de endpoints externos
│ │ │ ├── IpWhitelistInterceptor.java # Middleware de IP Whitelist
│ │ │ ├── SwaggerConfig.java # Configuración Swagger
│ │ │ └── WebConfig.java # CORS y seguridad
│ │ ├── controllers/ # Controladores REST
│ │ │ ├── NdcController.java # Endpoints NDC
│ │ │ └── PnrController.java # Endpoints PNR
│ │ ├── exception/ # Manejo de errores
│ │ │ └── GlobalExceptionHandler.java
│ │ ├── model/ # Modelos de datos
│ │ │ ├── PnrSegment.java # Entidad Segmento
│ │ │ ├── PnrTicket.java # Entidad Ticket
│ │ │ ├── dto/ # Data Transfer Objects
│ │ │ │ ├── CreateNdcRoundTripDto.java
│ │ │ │ ├── CreatePnrRequest.java
│ │ │ │ ├── PnrRecordResponse.java
│ │ │ │ └── UpdatePnrRequest.java
│ │ │ └── enums/ # Enumerados
│ │ │ ├── DisruptionType.java
│ │ │ ├── FlightType.java
│ │ │ └── SegmentStatus.java
│ │ ├── repositories/ # Repositorios JPA
│ │ │ ├── PnrSegmentRepository.java
│ │ │ └── PnrTicketRepository.java
│ │ ├── services/ # Servicios de negocio
│ │ │ ├── IberiaBookingService.java # Flujo NDC completo
│ │ │ ├── NdcRoundTripService.java # Round-Trip NDC
│ │ │ ├── PnrService.java # CRUD de PNRs
│ │ │ ├── SoapEnvelopeFactory.java # Fábrica de envelopes SOAP
│ │ │ └── SoapService.java # Cliente SOAP
│ │ └── util/ # Utilidades
│ │ └── PnrUtils.java
│ └── resources/
│ ├── application.properties # Configuración principal
│ └── application-dev.properties # Configuración desarrollo
└── data/
└── pnrs_database.db # Base de datos SQLite (se crea automáticamente)


## 🚀 Opciones de Ejecución

### **Opción 1: Ejecutar con Maven Wrapper (Recomendado)**

```bash
# Ir al directorio del proyecto
cd C:\workspace\PNRs-TOOLS\pnrs-tools-back-java\api

# Ejecutar la aplicación
.\mvnw spring-boot:run

# La aplicación estará disponible en:
# - http://localhost:3000
# - Swagger UI: http://localhost:3000/swagger-ui/index.html
```

### **Opción 2: Empaquetar y ejecutar como JAR**

```bash
# 1. Empaquetar el proyecto
.\mvnw clean package

# 2. Ejecutar el JAR generado
java -jar target/pnrs-tools-back-java-1.0.0.jar

# 3. (Opcional) Especificar perfil de entorno
java -jar target/pnrs-tools-back-java-1.0.0.jar --spring.profiles.active=dev
```

### **Opción 3: Ejecutar en modo desarrollo (con recarga automática)**

```bash
# Con DevTools activado
.\mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=true"

# O usando el perfil de desarrollo
.\mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

## ✅ Verificar que funciona
Después de ejecutar la aplicación, verifica estos puntos:

### **1. Health Check**

```bash
curl http://localhost:3000/actuator/health
# Debe devolver: {"status":"UP"}
```

### **2. Swagger UI**

```text
http://localhost:3000/swagger-ui/index.html
```

### **3. Endpoint de prueba - Obtener registros**

```bash
curl http://localhost:3000/api/records/one-way
# Debe devolver un array JSON con los registros
```

### **Verificar VPN (Mock INT)**

```bash
curl http://localhost:3000/api/vpn-status
# Devuelve: {"connected": true/false}
```

### **5. Probar un endpoint de disrupción**

```bash
curl -X POST http://localhost:3000/api/disruption/un \
  -H "Content-Type: application/json" \
  -d '{
    "pnr": "TESTPNR",
    "surname": "AUTOM",
    "flight": "1234",
    "flightClass": "Y",
    "date": "01012026",
    "origin": "MAD",
    "destination": "BCN"
  }'
```

## 📊 Endpoints Disponibles

| Método | 	Endpoint                   | Descripción                          | 
|--------|-----------------------------|--------------------------------------|
| GET	   | /api/records/{type}	       | Obtener registros por tipo de vuelo  | 
| POST	 | /api/save	                 | Crear registro manual de PNR         | 
| PUT	   | /api/update	               | Actualizar registro existente        | 
| POST	 | /api/inject-disruption	     | Inyectar disrupción SOAP             | 
| GET	   | /api/vpn-status             | 	Verificar estado de VPN             | 
| POST	 | /api/disruption/mock-int	   | Mock INT                             | 
| POST	 | /api/disruption/mock-pre	   | Mock PRE                             | 
| POST	 | /api/disruption/un	         | Disrupción UN                        | 
| POST	 | /api/disruption/untk	       | Disrupción UNTK                      | 
| POST	 | /api/disruption/flch	       | Disrupción FLCH                      | 
| POST	 | /api/v2/generate-pnr	       | Generar PNR v2 (síncrono)            | 
| POST	 | /api/v2/generate-pnr-stream | 	Generar PNR v2 (streaming SSE)      | 
| POST	 | /api/ndc/round-trip         | 	Crear reserva NDC Round-Trip        | 

## 🔧 Comandos Útiles


### **Compilación y Build**
```bash
# Compilar el proyecto
.\mvnw compile

# Limpiar y compilar
.\mvnw clean compile

# Empaquetar el proyecto
.\mvnw package

# Limpiar y empaquetar
.\mvnw clean package
```

### **Ejecución**
```bash
# Ejecutar la aplicación
.\mvnw spring-boot:run

# Ejecutar con perfil específico
.\mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Ejecutar con debug habilitado (puerto 5005)
.\mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### **Testing**
```bash
# Ejecutar todos los tests
.\mvnw test

# Ejecutar un test específico
.\mvnw test -Dtest=NombreDeLaClaseTest
```

### **Dependencias**
```bash
# Ver árbol de dependencias
.\mvnw dependency:tree

# Analizar dependencias no utilizadas
.\mvnw dependency:analyze
```

### **Base de Datos**
```bash
# La base de datos SQLite se crea automáticamente en:
# ./data/pnrs_database.db

# Para inspeccionarla, puedes usar:
# - SQLite Browser (GUI)
# - sqlite3 command line
sqlite3 data/pnrs_database.db ".tables"
```


## 🔐 Seguridad
```text
El proyecto incluye un middleware de IP Whitelist que restringe el acceso solo a IPs autorizadas. Las IPs permitidas se configuran en:

application.properties: security.allowed-ips

También acepta 127.0.0.1, ::1 y la IP local por defecto.
```


## 📝 Variables de Entorno

| Variable               | 	Descripción                            | 	Ejemplo                 | 
|------------------------|-----------------------------------------|--------------------------|
| AUTH_URL               | 	URL de autenticación Keycloak          | 	https://.../auth/...    | 
| AUTH_BASIC_CREDENTIALS | 	Credenciales Basic Auth                | 	Basic xxxx              | 
| AUTH2_HEADER           | 	Header Authorization2                  | 	Basic DC_exit/...       | 
| HOST_URL               | 	URL base del host (Availability, Fare) | 	https://int-...         | 
| HOST_URL_ORM           | 	URL base del host (Order)              | 	https://int-...         | 
| COOKIE_STRING          | 	Cookie para sesiones                   | 	mt.v=...                | 
| ALLOWED_IPS            | 	IPs autorizadas (coma separada)        | 	192.168.1.100,10.0.0.5  | 



## 🐛 Solución de Problemas
Error: java.lang.ExceptionInInitializerError
Asegúrate de usar Java 17 (no Java 21/26)

Verifica con: java -version

Error: Lombok not processing annotations
Limpia el caché: .\mvnw clean

Elimina la carpeta target manualmente

Recompila: .\mvnw compile

Error: Connection refused en endpoints externos
Verifica que la VPN esté activa

Ejecuta GET /api/vpn-status para verificar conectividad

Error: Table not found en SQLite
La base de datos se crea automáticamente al iniciar la aplicación

Verifica permisos de escritura en la carpeta data/

## 📄 Licencia
ISC

## 👥 Contribuciones

Para contribuir al proyecto, por favor:
[] Fork del repositorio
[] Crea una rama para tu feature (git checkout -b feature/amazing-feature)
[] Commit de tus cambios (git commit -m 'Add amazing feature')
[] Push a la rama (git push origin feature/amazing-feature)
[] Abre un Pull Request
