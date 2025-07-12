export interface Premio {
  id?: string;
  categoria: string;
  participante_id: string; 
  equipo_id?: string;       
  tiempo?: string;
  nombre_participante?: string;
  nombre_equipo?: string;
  participante_ref: string;
}