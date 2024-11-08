import { Component } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import {FullScreen} from 'ol/control.js';

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
    this.map = new Map({
      target: 'map',
      layers:[
        new TileLayer({
          source: new OSM()
        })
      ],
      view:new View({
        center: [0,0],
        zoom:2
      })
    });

    this.map.addControl(new FullScreen)
  }
}
