export type EstadoReserva =
  | "confirmada"
  | "llegado"
  | "no_show"
  | "cancelada"
  | "pendiente_aprobacion"
  | "rechazada";

export type Idioma = "es" | "ca" | "en";

export interface Reserva {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fecha: string;
  hora: string;
  personas: number;
  estado: EstadoReserva;
  notas_cliente: string | null;
  notas_internas: string | null;
  alergias: string[];
  idioma: Idioma;
  cancel_token: string;
  cancel_token_expires_at: string | null;
  reconfirmado: boolean;
  reconfirmacion_token: string | null;
  recordatorio_enviado: boolean;
  cliente_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  tags: string[];
  notas: string | null;
  visitas: number;
  created_at: string;
  updated_at: string;
}

export interface FranjaBloqueada {
  id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  created_at: string;
}

export interface DiaCerrado {
  id: string;
  fecha: string;
  motivo: string | null;
  created_at: string;
}

export interface Configuracion {
  clave: string;
  valor: unknown;
  updated_at: string;
}

export interface CancelarReservaResult {
  success: boolean;
  error?: string;
  reserva_id?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  fecha?: string;
  hora?: string;
  personas?: number;
  idioma?: string;
}

export interface WhatsAppLog {
  id: string;
  reserva_id: string;
  template: string;
  phone: string;
  status: "sent" | "failed" | "delivered" | "read";
  message_id: string | null;
  error: string | null;
  sent_at: string;
}

export type Database = {
  public: {
    Tables: {
      reservas: {
        Row: Reserva;
        Insert: Omit<Reserva, "id" | "created_at" | "updated_at" | "cancel_token" | "cancel_token_expires_at"> & {
          id?: string;
          cancel_token?: string;
          cancel_token_expires_at?: string;
        };
        Update: Partial<Omit<Reserva, "id" | "created_at">>;
        Relationships: [];
      };
      franjas_bloqueadas: {
        Row: FranjaBloqueada;
        Insert: Omit<FranjaBloqueada, "id" | "created_at">;
        Update: Partial<Omit<FranjaBloqueada, "id" | "created_at">>;
        Relationships: [];
      };
      dias_cerrados: {
        Row: DiaCerrado;
        Insert: Omit<DiaCerrado, "id" | "created_at">;
        Update: Partial<Omit<DiaCerrado, "id" | "created_at">>;
        Relationships: [];
      };
      configuracion: {
        Row: Configuracion;
        Insert: Omit<Configuracion, "updated_at">;
        Update: Partial<Omit<Configuracion, "clave">>;
        Relationships: [];
      };
    };
    Views: Record<string, unknown>;
    Functions: {
      cancelar_reserva: {
        Args: { p_token: string };
        Returns: CancelarReservaResult;
      };
    };
    Enums: Record<string, string[]>;
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
};
