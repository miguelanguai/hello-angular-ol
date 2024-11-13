import { Component } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import {FullScreen} from 'ol/control.js';
import { fromLonLat } from 'ol/proj';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent {
  map!: Map;

  ngOnInit():void{
    
    const spainCoordinates = fromLonLat([-0.4361, 39.1514]); // Coordenadas de Madrid

    this.map = new Map({
      target: 'map',
      layers:[
        new TileLayer({
          source: new OSM()
        })
      ],
      view:new View({
        center: spainCoordinates,
        zoom:14.5
      })
    });

    this.map.addControl(new FullScreen)
  }
}
