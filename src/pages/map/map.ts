import { Component, ViewChild, ElementRef } from '@angular/core';
import { 
  Platform, 
  NavController, 
  ModalController, 
  ToastController 
} from 'ionic-angular';

import { Storage } from '@ionic/storage';

import { PageMapView } from '../../pages/map-view/map-view';

import { MarkerVotingStation } from '../../models/marker-voting-station';
import { MarkersService } from '../../providers/markers';
import { PositionService } from '../../providers/position';

import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/map';

const latLngEurope: google.maps.LatLngLiteral = {lat: 49.1569609, lng: 13.898136};

@Component({
  selector: 'page-map',
  templateUrl: 'map.html'
})
export class PageMap {
  @ViewChild("gmap") mapElement: ElementRef;

  userPosition: google.maps.LatLngLiteral;

  private map: google.maps.Map;
  private userMarker: google.maps.Marker;
  private locationMarkers: google.maps.Marker[] = [];
  private markers: MarkerVotingStation[];
  private searchBox: google.maps.places.SearchBox;
  private searchEl: HTMLElement;
  private searchInput: HTMLInputElement;
  private markerIconUser: google.maps.Icon = {
    url: 'assets/icon/marker-user.png',
    size: new google.maps.Size(80, 80),
    anchor: new google.maps.Point(0, 30),
    scaledSize: new google.maps.Size(30, 30)
  };
  private markerIconVotingStation: google.maps.Icon = {
    url: 'assets/icon/marker-voting-station.png',
    size: new google.maps.Size(80, 101),
    anchor: new google.maps.Point(0, 38),
    scaledSize: new google.maps.Size(30, 38)
  };
  private markerIconLocation: google.maps.Icon = {
    url: 'assets/icon/marker-location.png',
    size: new google.maps.Size(82, 103),
    anchor: new google.maps.Point(0, 41),
    scaledSize: new google.maps.Size(30, 38)
  };
  private subscribePosition: Subscription;

  constructor(
    private platform: Platform,
    private navController: NavController,
    private modalController: ModalController,
    private markersService: MarkersService,
    private positionService: PositionService,
    private toastController: ToastController,
    private storage: Storage, 
  ) { }

  ionViewWillEnter() {
    this.searchEl = document.getElementById("search");
    this.searchInput = this.searchEl.getElementsByTagName('input')[0];
    this.setMap();
    this.presentToast();
  }

  ionViewDidEnter() {
    this.setMarkers();
    this.setUserMarker();
    this.setSearch();
  }

  ionViewDidLeave() {
    this.unsubscribe();
  }

  locate(position: any = this.userPosition) {
    if ( position ) {
      this.map.panTo(position);
      this.map.setZoom(16);
    }
    
    this.resetLocationMarkers();
    this.searchInput.value = '';
  }

  resetSearch() {
    this.map.panTo(latLngEurope);
    this.map.setZoom(4);
    this.searchInput.value = '';
    this.resetLocationMarkers();
  }

  private resetLocationMarkers() {
    if (this.locationMarkers.length) {
      this.locationMarkers.forEach(marker => marker.setMap(null));
      this.locationMarkers = [];
    }
  }

  private presentToast() {
    this.platform.ready().then(() => {
      this.storage.keys().then((data) => {
        if (data.indexOf('pages-toast-dismissed') == -1) {
          let toast = this.toastController.create({
            message: 'Apasă un punct de pe hartă pentru detalii',
            position: 'bottom',
            showCloseButton: true,
            closeButtonText: 'Închide',
            dismissOnPageChange: true,
            cssClass: 'toast-gmaps',
          });
          
          toast.onDidDismiss(() => {
            this.storage.set('pages-toast-dismissed', true);
          });

          toast.present();
        } 
      });
    });
  }

  private setMap() {
    // set map
    let mapOptions = {
      center: latLngEurope,
      disableDefaultUI: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      maxZoom: 16,
      minZoom: 2,
      zoom: 4
    };

    this.map = new google.maps.Map(this.mapElement.nativeElement, mapOptions);

    // set user marker
    this.userMarker = new google.maps.Marker({ map: this.map, position: null, icon: this.markerIconUser });
  }

  private setMarkers() {
    // get & set markers
    this.markers = this.markersService.getMarkers()
    let markers = this.markers.map(marker => {
      let options = {
        map: this.map,
        position: {
          lat: Number(marker.coords.lat),
          lng: Number(marker.coords.lng),
        },
        icon: this.markerIconVotingStation
      };
      let output = new google.maps.Marker(options)
      output.addListener('click', () => {
        if ( this.platform.is('mobile') ) this.navController.push(PageMapView, { id: marker.id });
        else this.modalController.create(PageMapView, { id: marker.id }).present();
      });
      return output;
    });

    new MarkerClusterer(this.map, markers,
      { imagePath: 'https://cdn.rawgit.com/googlemaps/js-marker-clusterer/gh-pages/images/m' }
    );
  }

  private setUserMarker() {
    // get user location and update user marker
    this.subscribePosition = this.positionService.getPosition()
      .subscribe(position => {
        this.userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        this.userMarker.setOptions({ position: this.userPosition, visible: true })
      });

  }

  private setSearch() {
    this.map.controls[google.maps.ControlPosition.TOP_CENTER].push(this.searchEl);
    this.searchBox = new google.maps.places.SearchBox(this.searchInput);

    this.searchBox.addListener('places_changed', () => {
      let places = this.searchBox.getPlaces();
      this.resetLocationMarkers();

      if (places.length == 0) return;

      // for each place, get the icon, name and location
      let bounds = new google.maps.LatLngBounds();
      places.forEach(place => {
        if (!place.geometry) return;

        // create a marker for each place
        this.locationMarkers.push(new google.maps.Marker({
          map: this.map,
          position: place.geometry.location,
          icon: this.markerIconLocation,
          title: place.name
        }));

        if (place.geometry.viewport) bounds.union(place.geometry.viewport);
        else bounds.extend(place.geometry.location);
      });
      this.map.fitBounds(bounds);
    });
  }

  private unsubscribe() {
    // do not unsubscribe if ionViewDidLeave in a children page
    if ( this.navController.getActive(true).name == 'PageMapView' ) return;

    this.subscribePosition.unsubscribe();
  }
}
