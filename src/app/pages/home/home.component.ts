import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, throwError } from 'rxjs';
import { ApiService } from './../../api.service';
import { AuthService } from './../../auth/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  dragons: any[];
  profileSub: Subscription;
  dragonsSub: Subscription;
  user: any;

  constructor(
    private api: ApiService,
    public auth: AuthService
  ) { }

  ngOnInit() {
    // Subscribe to userProfile$ subject
    this.profileSub = this.auth.userProfile$.subscribe(
      profile => this.user = profile ? profile : null,
      err => console.log(err)
    );
    // Get data from API
    this._getDragons();
  }

  private _getDragons() {
    // Subscribe to dragons API observable
    this.dragonsSub = this.api.getDragons$().subscribe(
      data => this.dragons = data,
      err => throwError(err)
    );
  }

  private _destroyDragonsSub() {
    // If a dragons subscription exists, unsubscribe
    if (this.dragonsSub) {
      this.dragonsSub.unsubscribe();
    }
  }

  get dragonsExist() {
    return !!this.dragons && this.dragons.length;
  }

  ngOnDestroy() {
    // Unsubscribe from observables
    this.profileSub.unsubscribe();
    this._destroyDragonsSub();
  }

}
