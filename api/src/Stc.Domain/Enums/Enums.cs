namespace Stc.Domain.Enums;

public enum TipoCliente { Persona, Empresa, Consorcio }

public enum TipoSitio { Edificio, Casa, Oficina, Comercio, Otro }

public enum TipoActivo { Camara, Portero, CerraduraMagnetica, Otro, Llavero, ControlAcceso }

public enum EstadoActivo { Activo, DeBaja, EnReparacion }

public enum TipoServicio { Instalacion, Mantenimiento, Otro }

public enum EstadoOrden { Pendiente, EnProceso, EsperandoMaterial, Resuelto, Cancelado }

public enum PrioridadOrden { Baja, Normal, Alta, Urgente }

public enum EstadoLead { Nuevo, Contactado, Convertido, Descartado }
