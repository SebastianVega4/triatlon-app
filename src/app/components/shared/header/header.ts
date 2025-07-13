import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class Header {
  isMenuOpen = false;

  constructor(private router: Router) {
    // Cerrar menú al cambiar de ruta
    this.router.events.subscribe(() => {
      this.isMenuOpen = false;
    });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }
}