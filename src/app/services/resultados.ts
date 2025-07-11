import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase';
import { map, switchMap, take } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';
import { Equipo } from '../interfaces/equipo.interface';
import { Participante } from '../interfaces/participante.interface';
import { Premio } from '../interfaces/premio.interface';

@Injectable({ providedIn: 'root' })
export class ResultadosService {
  constructor(private firebase: FirebaseService) { }

  private pad(num: number): string {
    return num < 10 ? `0${num}` : num.toString();
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

        const [hh, mm, ss] = lastParticipant.tiempo.split(':').map(Number);
        const totalSeconds = hh * 3600 + mm * 60 + ss + 300; // Add 5 minutes (300 seconds)

        const newHours = Math.floor(totalSeconds / 3600);
        const newMinutes = Math.floor((totalSeconds % 3600) / 60);
        const newSeconds = totalSeconds % 60;
        const newTime = `${this.pad(newHours)}:${this.pad(newMinutes)}:${this.pad(newSeconds)}`;

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
          let totalSegundos = 0;
          let tienePenalizacion = false;

          participantes.forEach(p => {
            if (p.penalizado) {
              tienePenalizacion = true;
            }
            const tiempo = p.tiempo || '00:00:00';
            const [hh, mm, ss] = tiempo.split(':').map(Number);
            totalSegundos += hh * 3600 + mm * 60 + ss;
          });

          const horas = Math.floor(totalSegundos / 3600);
          const minutos = Math.floor((totalSegundos % 3600) / 60);
          const segundos = totalSegundos % 60;
          const tiempoTotal = `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;

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
    const [hhA, mmA, ssA] = tiempoA.split(':').map(Number);
    const [hhB, mmB, ssB] = tiempoB.split(':').map(Number);
    return (hhA * 3600 + mmA * 60 + ssA) - (hhB * 3600 + mmB * 60 + ssB);
  }

  calcularPremios(): Promise<void> {
    return new Promise((resolve, reject) => {
      combineLatest([
        this.firebase.getEquipos().pipe(
          map((equipos: Equipo[]) =>
            equipos.sort((a, b) =>
              this.compararTiempos(a.tiempo_total || '99:59:59', b.tiempo_total || '99:59:59')
            ).slice(0, 3)
          )
        ),
        this.firebase.getAllParticipantes()
      ]).pipe(take(1)).subscribe({
        next: ([equiposPodio, todosParticipantes]) => {
          const batch = this.firebase.getFirestoreBatch();
          const premiosRef = this.firebase.createCollectionRef('premios');

          this.firebase.getPremios().pipe(take(1)).subscribe({
            next: (premiosExistentes) => {
              premiosExistentes.forEach(premio => {
                batch.delete(this.firebase.getDocRef(`premios/${premio.id}`));
              });

              const participantesElegibles = todosParticipantes.filter((p: Participante) =>
                !equiposPodio.map((e: Equipo) => e.id).includes(p.equipoId)
              );

              this.categorias.forEach((cat) => {
                const participantesCat = participantesElegibles.filter(
                  (p: Participante) => p.genero === cat.genero &&
                    p.disciplina === cat.disciplina &&
                    p.tiempo &&
                    p.tiempo !== '00:00:00'
                );

                if (participantesCat.length > 0) {
                  const mejor = participantesCat.sort((a, b) =>
                    this.compararTiempos(a.tiempo || '00:00:00', b.tiempo || '00:00:00')
                  )[0];

                  const nuevoPremio: Premio = {
                    categoria: cat.nombre,
                    participante_id: mejor.id || '',
                    equipo_id: mejor.equipoId || '',
                    tiempo: mejor.tiempo || '00:00:00',
                    nombre_participante: mejor.nombre,
                    nombre_equipo: ''
                  };

                  batch.set(this.firebase.getDocRef(`premios/${cat.nombre}`), nuevoPremio);
                }
              });

              batch.commit().then(resolve).catch(reject);
            },
            error: reject
          });
        },
        error: reject
      });
    });
  }

  getPremios(): Observable<Premio[]> {
    return this.firebase.getPremios();
  }

  getPremiosIndividuales(): Observable<Array<Premio & { equipo_nombre: string; participante_nombre: string }>> {
    return this.getPremios().pipe(
      switchMap(premios => {
        if (premios.length === 0) return of([]);

        return combineLatest(
          premios.map(premio =>
            combineLatest([
              this.firebase.getEquipo(premio.equipo_id),
              this.firebase.getParticipante(premio.equipo_id, premio.participante_id)
            ]).pipe(
              map(([equipo, participante]) => ({
                ...premio,
                equipo_nombre: equipo?.nombre || '',
                participante_nombre: participante?.nombre || ''
              }))
            )
          )
        );
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
