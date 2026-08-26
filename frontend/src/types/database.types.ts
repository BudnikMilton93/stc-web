export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          tipo: Database['public']['Enums']['tipo_cliente']
          nombre: string
          dni_cuit: string | null
          email: string | null
          telefono: string | null
          direccion: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo?: Database['public']['Enums']['tipo_cliente']
          nombre: string
          dni_cuit?: string | null
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tipo?: Database['public']['Enums']['tipo_cliente']
          nombre?: string
          dni_cuit?: string | null
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sitios: {
        Row: {
          id: string
          cliente_id: string
          nombre: string
          tipo: Database['public']['Enums']['tipo_sitio']
          direccion: string
          ciudad: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          nombre: string
          tipo?: Database['public']['Enums']['tipo_sitio']
          direccion: string
          ciudad?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          nombre?: string
          tipo?: Database['public']['Enums']['tipo_sitio']
          direccion?: string
          ciudad?: string | null
          notas?: string | null
          created_at?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          id: string
          sitio_id: string
          identificador: string
          piso: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sitio_id: string
          identificador: string
          piso?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sitio_id?: string
          identificador?: string
          piso?: string | null
          notas?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ocupantes: {
        Row: {
          id: string
          unidad_id: string
          nombre: string
          telefono: string | null
          email: string | null
          es_titular: boolean
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          unidad_id: string
          nombre: string
          telefono?: string | null
          email?: string | null
          es_titular?: boolean
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          unidad_id?: string
          nombre?: string
          telefono?: string | null
          email?: string | null
          es_titular?: boolean
          notas?: string | null
          created_at?: string
        }
        Relationships: []
      }
      activos: {
        Row: {
          id: string
          cliente_id: string
          sitio_id: string | null
          unidad_id: string | null
          ocupante_id: string | null
          tipo: Database['public']['Enums']['tipo_activo']
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          fecha_instalacion: string | null
          garantia_hasta: string | null
          estado: Database['public']['Enums']['estado_activo']
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          sitio_id?: string | null
          unidad_id?: string | null
          ocupante_id?: string | null
          tipo: Database['public']['Enums']['tipo_activo']
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          fecha_instalacion?: string | null
          garantia_hasta?: string | null
          estado?: Database['public']['Enums']['estado_activo']
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          sitio_id?: string | null
          unidad_id?: string | null
          ocupante_id?: string | null
          tipo?: Database['public']['Enums']['tipo_activo']
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          fecha_instalacion?: string | null
          garantia_hasta?: string | null
          estado?: Database['public']['Enums']['estado_activo']
          notas?: string | null
          created_at?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          id: string
          auth_id: string | null
          nombre: string
          email: string
          rol: Database['public']['Enums']['rol_usuario']
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          nombre: string
          email: string
          rol?: Database['public']['Enums']['rol_usuario']
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          nombre?: string
          email?: string
          rol?: Database['public']['Enums']['rol_usuario']
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      estado_activo: 'activo' | 'de_baja' | 'en_reparacion'
      rol_usuario: 'admin' | 'tecnico'
      tipo_activo: 'camara' | 'portero' | 'cerradura_magnetica' | 'pc' | 'impresora' | 'otro'
      tipo_cliente: 'persona' | 'empresa' | 'consorcio'
      tipo_sitio: 'edificio' | 'casa' | 'oficina' | 'comercio' | 'otro'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}