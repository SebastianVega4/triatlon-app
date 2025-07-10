import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ResultadosService } from '../../../services/resultados';

@Component({
  selector: 'app-resultados-disciplina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resultados-disciplina.html',
  styleUrls: ['./resultados-disciplina.scss']
})
export class ResultadosDisciplina implements OnInit {
  disciplina: string = '';
  resultados: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private resultadosService: ResultadosService
  ) {}

  ngOnInit(): void {
    this.disciplina = this.route.snapshot.paramMap.get('disciplina') || '';
    this.resultadosService.getResultadosPorDisciplina(this.disciplina).subscribe(resultados => {
      this.resultados = resultados;
      this.loading = false;
    });
  }
}