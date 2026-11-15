# Diagramas de tercera entrega
## Modelo de datos
```mermaid
erDiagram
 ORGANIZACION ||--o{ PROYECTO : agrupa
 DONANTE ||--o{ DONACION : realiza
 PROYECTO o|--o{ DONACION : recibe
 PROYECTO ||--o{ GASTO : registra
 USUARIO { string email string passwordHash string rol }
 ORGANIZACION { ObjectId _id string nombre string contacto }
 PROYECTO { ObjectId organizacion_id string nombre number objetivo_monto }
 DONANTE { ObjectId _id string nombre string email }
 DONACION { ObjectId donante_id ObjectId proyecto_id number monto Date fecha }
 GASTO { ObjectId proyecto_id string concepto number monto Date fecha }
```
Usuario autoriza acceso; no se guarda autor_id en movimientos. No existe auditoría por usuario. Las relaciones se validan en controladores porque MongoDB no aplica claves foráneas por sí solo.

## Casos de uso / permisos
```mermaid
flowchart TB
 A[Administrador] --> P[Gestionar proyectos]
 A --> C[Corregir donaciones y eliminar proyectos vacíos]
 O[Operador] --> P
 O --> R[Registrar aportes y gastos]
 A --> R
 Q[Consulta] --> S[Consultar saldos e historial]
 O --> S
 A --> S
 V[Visitante] --> H[Consultar asistente guiado]
```
## Secuencia: registrar gasto
```mermaid
sequenceDiagram
 participant N as Navegador
 participant M as Middleware
 participant C as Controlador
 participant D as MongoDB
 N->>M: POST /api/gastos JSON
 M->>M: Verificar JWT, rol y origen
 M->>C: Solicitud autorizada
 C->>C: Iniciar transacción y modificar ControlFinanciero
 C->>D: Buscar proyecto y sumar movimientos
 D-->>C: Proyecto y saldo
 alt Monto supera saldo
 C->>D: Revertir transacción
 C-->>N: 400 sin escritura
 else Monto válido
 C->>D: Guardar gasto con Mongoose y confirmar transacción
 D-->>C: Documento creado
 C-->>N: 201 y gasto
 end
```

ControlFinanciero es un documento técnico compartido con revision; no contiene saldo. La transacción usa el contexto de sesión de Mongoose. Se ejecutan consultas en orden y se devuelve HTTP después del commit. Ver services/finanzas.js.
