import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase';
import { map, switchMap, take, catchError } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { Premio } from '../interfaces/premio.interface';
import { doc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class ResultadosService {
  loading = false;
  constructor(private firebase: FirebaseService) { }

  private pad(num: number, digits: number = 2): string {
    return num.toString().padStart(digits, '0');
  }

  private categorias = [
    { nombre: 'mejor_mujer_natacion', genero: 'F', disciplina: 'natacion' },
    { nombre: 'mejor_hombre_natacion', genero: 'M', disciplina: 'natacion' },
    { nombre: 'mejor_mujer_ciclismo', genero: 'F', disciplina: 'ciclismo' },
    { nombre: 'mejor_hombre_ciclismo', genero: 'M', disciplina: 'ciclismo' },
    { nombre: 'mejor_mujer_atletismo', genero: 'F', disciplina: 'atletismo' },
    { nombre: 'mejor_hombre_atletismo', genero: 'M', disciplina: 'atletismo' }
  ];

  aplicarPenalizacion(participanteId: string, equipoId: string, disciplina: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.firebase.getParticipantes(equipoId).pipe(take(1)).subscribe({
        next: async (participantes) => {
          const participante = participantes.find(p => p.id === participanteId);
          if (!participante) {
            reject('Participante no encontrado');
            return;
          }

          // Get all participants in the same discipline to find the last time
          const allParticipants = await this.firebase.getAllParticipantes().pipe(take(1)).toPromise();
          if (!allParticipants) {
            reject('No se pudieron obtener los participantes');
            return;
          }

          const disciplineParticipants = allParticipants.filter(p =>
            p.disciplina === disciplina &&
            p.tiempo &&
            p.tiempo !== '00:00:00' &&
            !p.penalizado
          );

          if (disciplineParticipants.length === 0) {
            reject('No hay participantes en esta disciplina para calcular penalización');
            return;
          }

          const lastParticipant = disciplineParticipants.sort((a, b) =>
            this.compararTiempos(b.tiempo || '00:00:00', a.tiempo || '00:00:00')
          )[0];

          if (!lastParticipant.tiempo) {
            reject('El último participante no tiene tiempo registrado');
            return;
          }

          const [hms, ms] = lastParticipant.tiempo.split('.');
          const [hh, mm, ss] = hms.split(':').map(Number);
          const milliseconds = ms ? Number(ms) : 0;
          const totalMilliseconds = (hh * 3600 + mm * 60 + ss) * 1000 + milliseconds + 300000;

          const newHours = Math.floor(totalMilliseconds / 3600000);
          const remainingMs = totalMilliseconds % 3600000;
          const newMinutes = Math.floor(remainingMs / 60000);
          const remainingSecMs = remainingMs % 60000;
          const newSeconds = Math.floor(remainingSecMs / 1000);
          const newMilliseconds = remainingSecMs % 1000;

          const newTime = `${this.pad(newHours)}:${this.pad(newMinutes)}:${this.pad(newSeconds)}.${this.pad(newMilliseconds, 3)}`;
          await this.firebase.updateParticipante(equipoId, participanteId, {
            tiempo: newTime,
            penalizado: true
          });

          await this.calcularTiempoTotal(equipoId);
          await this.actualizarPosiciones();
          await this.calcularPremios();

          resolve();
        },
        error: (error: any) => reject(error)
      });
    });
  }

  calcularTiempoTotal(equipoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.firebase.getParticipantes(equipoId).pipe(take(1)).subscribe({
        next: (participantes) => {
          let totalMilliseconds = 0;
          let tienePenalizacion = false;

          participantes.forEach(p => {
            if (p.penalizado) {
              tienePenalizacion = true;
            }
            const tiempo = p.tiempo || '00:00:00.000';
            const [hms, ms] = tiempo.split('.');
            const [hh, mm, ss] = hms.split(':').map(Number);
            const milliseconds = ms ? Number(ms) : 0;
            totalMilliseconds += (hh * 3600 + mm * 60 + ss) * 1000 + milliseconds;
          });

          const horas = Math.floor(totalMilliseconds / 3600000);
          const remainingMs = totalMilliseconds % 3600000;
          const minutos = Math.floor(remainingMs / 60000);
          const remainingSecMs = remainingMs % 60000;
          const segundos = Math.floor(remainingSecMs / 1000);
          const milisegundos = remainingSecMs % 1000;

          const tiempoTotal = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}.${this.pad(milisegundos, 3)}`;

          this.firebase.updateEquipo(equipoId, {
            tiempo_total: tiempoTotal,
            penalizacion: tienePenalizacion
          }).then(resolve).catch(reject);
        },
        error: reject
      });
    });
  }

  actualizarPosiciones(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.firebase.getEquipos().pipe(take(1)).subscribe({
        next: (equipos) => {
          const equiposOrdenados = [...equipos].sort((a, b) =>
            this.compararTiempos(a.tiempo_total || '99:59:59', b.tiempo_total || '99:59:59')
          );

          const updates = equiposOrdenados.map((equipo, index) => ({
            id: equipo.id,
            posicion: index + 1
          }));

          Promise.all(
            updates.map(e => this.firebase.updateEquipo(e.id as string, { posicion: e.posicion }))
          )
            .then(() => resolve())
            .catch(reject);
        },
        error: reject
      });
    });
  }

  compararTiempos(tiempoA: string, tiempoB: string): number {
    const parseTime = (time: string) => {
      const [hms, ms] = time.split('.');
      const [hh, mm, ss] = hms.split(':').map(Number);
      const milliseconds = ms ? Number(ms) : 0;
      return (hh * 3600 + mm * 60 + ss) * 1000 + milliseconds;
    };

    return parseTime(tiempoA) - parseTime(tiempoB);
  }

  async calcularPremios(): Promise<void> {
    this.loading = true;
    console.log('Iniciando cálculo de premios...');

    try {
      // Obtener datos necesarios
      const [equipos, todosParticipantes] = await combineLatest([
        this.firebase.getEquipos(),
        this.firebase.getAllParticipantes()
      ]).pipe(take(1)).toPromise() || [[], []];

      console.log('Total equipos:', equipos.length);
      console.log('Total participantes:', todosParticipantes.length);

      // 1. Filtrar equipos con tiempos válidos (no 00:00:00)
      const equiposConTiempo = equipos.filter(e =>
        e.tiempo_total && e.tiempo_total !== '00:00:00.000'
      );
      console.log('Equipos con tiempo válido:', equiposConTiempo.length);

      // 2. Identificar equipos del podio (top 3)
      const equiposPodio = [...equiposConTiempo]
        .sort((a, b) => this.compararTiempos(a.tiempo_total || '99:59:59', b.tiempo_total || '99:59:59'))
        .slice(0, 3);

      console.log('Equipos en podio:', equiposPodio.map(e => e.nombre));
      const idsEquiposPodio = equiposPodio.map(e => e.id || '');

      // 3. Filtrar participantes válidos (solo necesitamos disciplina, género y tiempo válido)
      const participantesValidos = todosParticipantes.filter(p => {
        // Verificar que exista el objeto participante
        if (!p) return false;

        // Verificar datos mínimos requeridos
        const tieneDatosBasicos = p.disciplina && p.genero;
        const tieneTiempoValido = p.tiempo && p.tiempo !== '00:00:00' && p.tiempo !== '00:00:00.000';

        return tieneDatosBasicos && tieneTiempoValido;
      });

      console.log('Participantes con datos válidos:', participantesValidos.length);

      // 4. Filtrar participantes elegibles (no en podio)
      const participantesElegibles = participantesValidos.filter(p => {
        return !idsEquiposPodio.includes(p.equipoId || '');
      });

      console.log('Participantes elegibles para premios:', participantesElegibles.length);

      if (participantesElegibles.length === 0) {
        console.warn('No hay participantes elegibles. Revisar datos de participantes:', todosParticipantes);
        throw new Error('No hay participantes elegibles para premios individuales. Verifique que los participantes tengan disciplina, género y tiempo válidos, y que no pertenezcan a equipos del podio.');
      }

      const batch = this.firebase.getFirestoreBatch();

      // Limpiar premios existentes
      const premiosExistentes = await this.firebase.getPremios().pipe(take(1)).toPromise() || [];
      premiosExistentes.forEach(premio => {
        if (premio.id) {
          batch.delete(this.firebase.getDocRef(`premios/${premio.id}`));
        }
      });

      // Procesar cada categoría de premios
      const categoriasPremios = [
        { nombre: 'mejor_mujer_natacion', genero: 'F', disciplina: 'natacion' },
        { nombre: 'mejor_hombre_natacion', genero: 'M', disciplina: 'natacion' },
        { nombre: 'mejor_mujer_ciclismo', genero: 'F', disciplina: 'ciclismo' },
        { nombre: 'mejor_hombre_ciclismo', genero: 'M', disciplina: 'ciclismo' },
        { nombre: 'mejor_mujer_atletismo', genero: 'F', disciplina: 'atletismo' },
        { nombre: 'mejor_hombre_atletismo', genero: 'M', disciplina: 'atletismo' }
      ];

      let premiosCreados = 0;

      for (const categoria of categoriasPremios) {
        const participantesCategoria = participantesElegibles.filter(p =>
          p.genero.toUpperCase() === categoria.genero.toUpperCase() &&
          p.disciplina?.toLowerCase() === categoria.disciplina.toLowerCase()
        );

        console.log(`Categoría ${categoria.nombre}: ${participantesCategoria.length} participantes`);

        if (participantesCategoria.length > 0) {
          const ganador = participantesCategoria.sort((a, b) =>
            this.compararTiempos(a.tiempo || '99:59:59', b.tiempo || '99:59:59')
          )[0];

          const equipoGanador = equipos.find(e => e.id === ganador.equipoId);

          const nuevoPremio = {
            categoria: categoria.nombre,
            participante_id: ganador.id || '',
            equipo_id: ganador.equipoId || '',
            tiempo: ganador.tiempo || '00:00:00',
            participante_nombre: ganador.nombre || 'Participante desconocido',
            equipo_nombre: equipoGanador?.nombre || 'Equipo desconocido',
            participante_ref: ganador.id ? `equipos/${ganador.equipoId}/participantes/${ganador.id}` : ''
          };

          console.log(`Asignando premio ${categoria.nombre} a ${ganador.nombre}`);

          const premiosColRef = this.firebase.createCollectionRef('premios');
          batch.set(doc(premiosColRef), nuevoPremio);
          premiosCreados++;
        }
      }

      // Premio especial de actitud deportiva
      const participanteEspecial = participantesValidos.find(p => p.premio_especial);
      if (participanteEspecial) {
        const equipoEspecial = equipos.find(e => e.id === participanteEspecial.equipoId);

        const premioEspecial = {
          categoria: 'actitud_deportiva',
          participante_id: participanteEspecial.id || '',
          equipo_id: participanteEspecial.equipoId || '',
          tiempo: '00:00:00',
          participante_nombre: participanteEspecial.nombre || 'Participante especial',
          equipo_nombre: equipoEspecial?.nombre || 'Equipo desconocido',
          participante_ref: participanteEspecial.id ? `equipos/${participanteEspecial.equipoId}/participantes/${participanteEspecial.id}` : ''
        };

        const premiosColRef = this.firebase.createCollectionRef('premios');
        batch.set(doc(premiosColRef), premioEspecial);
        premiosCreados++;
      }

      if (premiosCreados > 0) {
        await batch.commit();
        console.log(`Se crearon ${premiosCreados} premios correctamente`);
      } else {
        console.warn('No se crearon premios. Datos completos:', {
          equipos,
          todosParticipantes,
          participantesValidos,
          participantesElegibles
        });
        throw new Error('No se crearon premios. Verifique que los participantes tengan los datos requeridos.');
      }
    } catch (error) {
      console.error('Error en calcularPremios:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  getPremios(): Observable<Premio[]> {
    return this.firebase.getPremios();
  }

  getPremiosIndividuales(): Observable<any[]> {
  return this.firebase.getPremios().pipe(
    map(premios => {
      console.log('Premios obtenidos:', premios); // <-- Añade esto
      return premios || [];
    }),
    catchError(err => {
      console.error('Error al obtener premios:', err);
      return of([]);
    })
  );
}

  getResultadosPorDisciplina(disciplina: string): Observable<Array<Participante & { equipo_nombre?: string }>> {
    return this.firebase.getAllParticipantes().pipe(
      switchMap((participantes: Participante[]) => {
        const filtrados = participantes.filter(p => p.disciplina === disciplina);

        if (filtrados.length === 0) return of([]);

        return combineLatest(
          filtrados.map(p =>
            this.firebase.getEquipo(p.equipoId as string).pipe(
              map((equipo: Equipo | null) => ({
                ...p,
                equipo_nombre: equipo?.nombre
              }))
            )
          )
        );
      }),
      map((participantes: (Participante & { equipo_nombre?: string })[]) =>
        participantes.sort((a, b) =>
          this.compararTiempos(a.tiempo || '99:59:59', b.tiempo || '99:59:59')
        )
      )
    );
  }

  setPremioEspecial(participanteId: string, equipoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.firebase.getAllParticipantes().pipe(take(1)).subscribe({
        next: (todosParticipantes) => {
          const batch = this.firebase.getFirestoreBatch();

          todosParticipantes.forEach(p => {
            if (p.premio_especial) {
              batch.update(this.firebase.getDocRef(`equipos/${p.equipoId}/participantes/${p.id}`), {
                premio_especial: false
              });
            }
          });

          batch.update(
            this.firebase.getDocRef(`equipos/${equipoId}/participantes/${participanteId}`),
            { premio_especial: true }
          );

          batch.commit().then(resolve).catch(reject);
        },
        error: reject
      });
    });
  }

  getVisibilidadResultados(): Observable<boolean> {
    return this.firebase.getConfiguracion().pipe(
      map(config => config?.resultados_visibles ?? true)
    );
  }

  toggleVisibilidadResultados(visible: boolean): Promise<void> {
    return this.firebase.setConfiguracion(visible);
  }
}
