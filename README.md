# Swapstyle — Sistema de gestión de ropa en consignación

Aplicación web para gestionar stock, ventas, pagos a proveedores y gastos de un local de ropa en consignación.

## Stack

- **Next.js 14** (App Router, Server Components)
- **Supabase** (PostgreSQL + API)
- **shadcn/ui** + **Tailwind CSS**
- **TypeScript**

## Configuración inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un nuevo proyecto
2. En **SQL Editor** de Supabase, ejecutar el contenido de `supabase/schema.sql`

### 3. Configurar variables de entorno

Editar `.env.local` con los valores de tu proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Los valores están en: **Supabase → Project Settings → API**

### 4. Levantar el servidor

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Módulos

| Módulo | Ruta | Descripción |
|---|---|---|
| Dashboard | `/` | KPIs: stock disponible, ventas del día, pagos pendientes, últimas 5 ventas |
| Punto de Venta | `/pos` | Registro de ventas — búsqueda de prendas, carrito, métodos de pago |
| Productos | `/productos` | CRUD de prendas con filtros por estado, proveedor y categoría |
| Proveedores | `/proveedores` | CRUD de proveedores con detalle de prendas y montos pendientes |
| Pagos | `/pagos` | Gestión de pagos pendientes agrupados por proveedor |
| Gastos | `/gastos` | Registro de gastos con filtros por fecha y categoría |
| Cierre de Caja | `/cierre` | Resumen financiero por período con desglose por método de pago |

## Reglas de negocio

- Un producto solo puede venderse si su estado es `disponible`
- El precio del proveedor siempre debe ser menor al precio de venta
- Al confirmar una venta se crean automáticamente los registros de pagos pendientes a proveedores
- Los pagos a proveedores nunca se eliminan, solo cambian de estado (`pendiente` → `pagado`)
- Los códigos de producto (ej: `SW-001`) son únicos y se autogeneran sugeridos

## Deploy en producción (Vercel)

1. Hacer push del proyecto a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Agregar las variables de entorno en Vercel → Settings → Environment Variables
4. Deploy automático
