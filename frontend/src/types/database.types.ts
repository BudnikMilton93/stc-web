export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activos: {
        Row: {
          cliente_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_activo"]
          fecha_instalacion: string | null
          garantia_hasta: string | null
          id: string
          marca: string | null
          modelo: string | null
          notas: string | null
          numero_serie: string | null
          ocupante_id: string | null
          proximo_mantenimiento: string | null
          sitio_id: string | null
          tipo: Database["public"]["Enums"]["tipo_activo"]
          ultima_revision: string | null
          unidad_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_activo"]
          fecha_instalacion?: string | null
          garantia_hasta?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          notas?: string | null
          numero_serie?: string | null
          ocupante_id?: string | null
          proximo_mantenimiento?: string | null
          sitio_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_activo"]
          ultima_revision?: string | null
          unidad_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_activo"]
          fecha_instalacion?: string | null
          garantia_hasta?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          notas?: string | null
          numero_serie?: string | null
          ocupante_id?: string | null
          proximo_mantenimiento?: string | null
          sitio_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_activo"]
          ultima_revision?: string | null
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_ocupante_id_fkey"
            columns: ["ocupante_id"]
            isOneToOne: false
            referencedRelation: "ocupantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      adjuntos: {
        Row: {
          created_at: string
          descripcion: string | null
          entidad_id: string
          entidad_tipo: string
          id: string
          url: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          entidad_id: string
          entidad_tipo: string
          id?: string
          url: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          entidad_id?: string
          entidad_tipo?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string
          direccion: string | null
          dni_cuit: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          dni_cuit?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          dni_cuit?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string
        }
        Relationships: []
      }
      contactos_cliente: {
        Row: {
          cargo: string | null
          cliente_id: string
          created_at: string
          email: string | null
          es_principal: boolean
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          cargo?: string | null
          cliente_id: string
          created_at?: string
          email?: string | null
          es_principal?: boolean
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          cargo?: string | null
          cliente_id?: string
          created_at?: string
          email?: string | null
          es_principal?: boolean
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contactos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          nombre: string
          precio_costo: number | null
          precio_venta: number | null
          sku: string | null
          stock_actual: number
          stock_minimo: number
          unidad: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          nombre: string
          precio_costo?: number | null
          precio_venta?: number | null
          sku?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          nombre?: string
          precio_costo?: number | null
          precio_venta?: number | null
          sku?: string | null
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          cliente_id: string | null
          created_at: string
          email: string | null
          estado: Database["public"]["Enums"]["estado_lead"]
          id: string
          mensaje: string | null
          nombre: string
          servicio_interes: string | null
          telefono: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_lead"]
          id?: string
          mensaje?: string | null
          nombre: string
          servicio_interes?: string | null
          telefono?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_lead"]
          id?: string
          mensaje?: string | null
          nombre?: string
          servicio_interes?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          insumo_id: string
          motivo: string | null
          orden_item_id: string | null
          tipo: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          insumo_id: string
          motivo?: string | null
          orden_item_id?: string | null
          tipo: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          insumo_id?: string
          motivo?: string | null
          orden_item_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_orden_item_id_fkey"
            columns: ["orden_item_id"]
            isOneToOne: false
            referencedRelation: "orden_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ocupantes: {
        Row: {
          created_at: string
          email: string | null
          es_titular: boolean
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          unidad_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          es_titular?: boolean
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          unidad_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          es_titular?: boolean
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocupantes_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string
          id: string
          insumo_id: string | null
          orden_id: string
          precio_unitario: number
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion: string
          id?: string
          insumo_id?: string | null
          orden_id: string
          precio_unitario?: number
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string
          id?: string
          insumo_id?: string | null
          orden_id?: string
          precio_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_items_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_items_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "ordenes_trabajo"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_trabajo: {
        Row: {
          activo_id: string | null
          cliente_id: string
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_orden"]
          fecha_programada: string | null
          fecha_resolucion: string | null
          fecha_solicitud: string
          id: string
          notas_resolucion: string | null
          prioridad: Database["public"]["Enums"]["prioridad_orden"]
          sitio_id: string | null
          tecnico_id: string | null
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio"]
          updated_at: string
        }
        Insert: {
          activo_id?: string | null
          cliente_id: string
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_orden"]
          fecha_programada?: string | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          id?: string
          notas_resolucion?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_orden"]
          sitio_id?: string | null
          tecnico_id?: string | null
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio"]
          updated_at?: string
        }
        Update: {
          activo_id?: string | null
          cliente_id?: string
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_orden"]
          fecha_programada?: string | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          id?: string
          notas_resolucion?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_orden"]
          sitio_id?: string | null
          tecnico_id?: string | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_trabajo_activo_id_fkey"
            columns: ["activo_id"]
            isOneToOne: false
            referencedRelation: "activos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sitios: {
        Row: {
          ciudad: string | null
          cliente_id: string
          created_at: string
          direccion: string
          id: string
          nombre: string
          notas: string | null
          tipo: Database["public"]["Enums"]["tipo_sitio"]
        }
        Insert: {
          ciudad?: string | null
          cliente_id: string
          created_at?: string
          direccion: string
          id?: string
          nombre: string
          notas?: string | null
          tipo?: Database["public"]["Enums"]["tipo_sitio"]
        }
        Update: {
          ciudad?: string | null
          cliente_id?: string
          created_at?: string
          direccion?: string
          id?: string
          nombre?: string
          notas?: string | null
          tipo?: Database["public"]["Enums"]["tipo_sitio"]
        }
        Relationships: [
          {
            foreignKeyName: "sitios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          created_at: string
          id: string
          identificador: string
          notas: string | null
          piso: string | null
          sitio_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identificador: string
          notas?: string | null
          piso?: string | null
          sitio_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identificador?: string
          notas?: string | null
          piso?: string | null
          sitio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_sitio_id_fkey"
            columns: ["sitio_id"]
            isOneToOne: false
            referencedRelation: "sitios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          auth_id: string | null
          created_at: string
          email: string
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean
          auth_id?: string | null
          created_at?: string
          email: string
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          auth_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_activo: { Args: never; Returns: boolean }
    }
    Enums: {
      estado_activo: "activo" | "de_baja" | "en_reparacion"
      estado_lead: "nuevo" | "contactado" | "convertido" | "descartado"
      estado_orden:
        | "pendiente"
        | "en_proceso"
        | "esperando_material"
        | "resuelto"
        | "cancelado"
      prioridad_orden: "baja" | "normal" | "alta" | "urgente"
      tipo_activo:
        | "camara"
        | "portero"
        | "cerradura_magnetica"
        | "otro"
        | "llavero"
        | "control_acceso"
      tipo_cliente: "persona" | "empresa" | "consorcio"
      tipo_servicio: "instalacion" | "mantenimiento" | "otro"
      tipo_sitio: "edificio" | "casa" | "oficina" | "comercio" | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_activo: ["activo", "de_baja", "en_reparacion"],
      estado_lead: ["nuevo", "contactado", "convertido", "descartado"],
      estado_orden: [
        "pendiente",
        "en_proceso",
        "esperando_material",
        "resuelto",
        "cancelado",
      ],
      prioridad_orden: ["baja", "normal", "alta", "urgente"],
      tipo_activo: [
        "camara",
        "portero",
        "cerradura_magnetica",
        "otro",
        "llavero",
        "control_acceso",
      ],
      tipo_cliente: ["persona", "empresa", "consorcio"],
      tipo_servicio: ["instalacion", "mantenimiento", "otro"],
      tipo_sitio: ["edificio", "casa", "oficina", "comercio", "otro"],
    },
  },
} as const

