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
    return new Promise((resolve, reject) => {
      this.firebase.getEquipos().pipe(take(1)).subscribe({
        next: (equipos) => {
          const equiposOrdenados = [...equipos].sort((a, b) =>
            this.compararTiempos(a.tiempo_total || '99:59:59', b.tiempo_total || '99:59:59')
          );

          const updates = equiposOrdenados.map((equipo, index) => ({
            id: equipo.id,
            posicion: index + 1
          }));

          Promise.all(updates.map(e =>
            this.firebase.updateEquipo(e.id as string, { posicion: e.posicion })
          )).then(() => resolve()).catch(reject);
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
          const idsEquiposPodio = equiposPodio.map((e: Equipo) => e.id);
          const participantesElegibles = todosParticipantes.filter((p: Participante) => !idsEquiposPodio.includes(p.equipoId));

          const categorias = [
            { nombre: 'mejor_mujer_natacion', genero: 'F', disciplina: 'natacion' },
            { nombre: 'mejor_hombre_natacion', genero: 'M', disciplina: 'natacion' },
            { nombre: 'mejor_mujer_ciclismo', genero: 'F', disciplina: 'ciclismo' },
            { nombre: 'mejor_hombre_ciclismo', genero: 'M', disciplina: 'ciclismo' },
            { nombre: 'mejor_mujer_atletismo', genero: 'F', disciplina: 'atletismo' },
            { nombre: 'mejor_hombre_atletismo', genero: 'M', disciplina: 'atletismo' }
          ];

          const batch = this.firebase.afs.firestore.batch();
          const premiosRef = this.firebase.afs.collection('premios');

          this.firebase.afs.collection('premios').get().pipe(take(1)).subscribe({
            next: (snapshot) => {
              snapshot.forEach(doc => {
                batch.delete(doc.ref);
              });

              categorias.forEach(cat => {
                const participantesCat = participantesElegibles.filter(
                  p => p.genero === cat.genero &&
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

                  batch.set(premiosRef.doc().ref, nuevoPremio);
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

  aplicarPenalizacion(equipoId: string, disciplina: 'natacion' | 'ciclismo' | 'atletismo'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.firebase.afs.collection<Participante>(`equipos/${equipoId}/participantes`,
        ref => ref.where('disciplina', '==', disciplina))
        .get().pipe(take(1)).subscribe({
          next: (snapshot) => {
            if (snapshot.empty) {
              reject(new Error('No se encontró participante para esta disciplina'));
              return;
            }

            const participante = snapshot.docs[0].data() as Participante;
            const participanteId = snapshot.docs[0].id;

            this.firebase.afs.collectionGroup<Participante>('participantes',
              ref => ref.where('disciplina', '==', disciplina)
                .orderBy('tiempo', 'desc')
                .limit(1))
              .get().pipe(take(1)).subscribe({
                next: (lastSnapshot) => {
                  if (lastSnapshot.empty) {
                    reject(new Error('No hay participantes en esta disciplina'));
                    return;
                  }

                  const ultimoTiempo = lastSnapshot.docs[0].data().tiempo;
                  if (!ultimoTiempo) {
                    reject(new Error('Tiempo no disponible'));
                    return;
                  }

                  const [hh, mm, ss] = ultimoTiempo.split(':').map(Number);
                  const totalSegundos = hh * 3600 + mm * 60 + ss + 300;

                  const nuevasHoras = Math.floor(totalSegundos / 3600);
                  const nuevosMinutos = Math.floor((totalSegundos % 3600) / 60);
                  const nuevosSegundos = totalSegundos % 60;
                  const nuevoTiempo = `${this.pad(nuevasHoras)}:${this.pad(nuevosMinutos)}:${this.pad(nuevosSegundos)}`;

                  this.firebase.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).update({
                    tiempo: nuevoTiempo,
                    penalizado: true
                  }).then(() => {
                    const campoPenalizacion = `penalizacion_${disciplina}`;
                    this.firebase.updateEquipo(equipoId, {
                      [campoPenalizacion]: true
                    }).then(resolve).catch(reject);
                  }).catch(reject);
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

  getPremiosIndividuales(): Observable<Array<Premio & { equipo_nombre: string, participante_nombre: string }>> {
    return this.getPremios().pipe(
      switchMap(premios => {
        if (premios.length === 0) return of([]);

        return combineLatest(
          premios.map(premio =>
            combineLatest([
              this.firebase.getEquipo(premio.equipo_id),
              this.firebase.afs.doc<Participante>(`equipos/${premio.equipo_id}/participantes/${premio.participante_id}`).valueChanges()
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
    return this.firebase.afs.collectionGroup<Participante>('participantes',
      ref => ref.where('disciplina', '==', disciplina))
      .valueChanges().pipe(
        switchMap((participantes: Participante[]) => {
          if (participantes.length === 0) return of([]);

          return combineLatest(
            participantes.map(p =>
              this.firebase.getEquipo(p.equipoId as string).pipe(
                map(equipo => ({
                  ...p,
                  equipo_nombre: equipo?.nombre
                }))
              )
            ));
        }),
        map((participantes: any[]) => participantes.sort((a, b) =>
          this.compararTiempos(a.tiempo || '99:59:59', b.tiempo || '99:59:59')
        ))
      );
  }

  setPremioEspecial(participanteId: string, equipoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.firebase.afs.collectionGroup<Participante>('participantes',
        ref => ref.where('premio_especial', '==', true))
        .get().pipe(take(1)).subscribe({
          next: (snapshot) => {
            const batch = this.firebase.afs.firestore.batch();

            snapshot.forEach(doc => {
              batch.update(doc.ref, { premio_especial: false });
            });

            batch.update(
              this.firebase.afs.doc(`equipos/${equipoId}/participantes/${participanteId}`).ref,
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