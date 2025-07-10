import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  isAdminRoute = false;

  constructor() {
    // Lógica para determinar si está en ruta admin
  }
}