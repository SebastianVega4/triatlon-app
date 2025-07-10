export interface Participante {
  id?: string;
  equipoId: string;
  nombre: string;
  genero: 'M' | 'F';
  disciplina: 'natacion' | 'ciclismo' | 'atletismo' | null;
  tiempo?: string;
  premio_especial?: boolean;
  penalizado?: boolean;
}