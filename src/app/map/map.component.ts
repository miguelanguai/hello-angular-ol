import { Component } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import { FullScreen } from 'ol/control.js';
import { fromLonLat } from 'ol/proj';

import * as GeoTIFF from 'geotiff';

import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent {
  map!: Map;

  async ngOnInit() {
    const miCapaRasterData = await this.loadGeoTIFF('prueba6.tif');
    const miCapa = this.createGeoTIFFLayer(miCapaRasterData);

    // Coordenadas del centro de tu imagen (convertidas de Web Mercator a geográficas)
    // Centro en Web Mercator: (-61563.589, 4708337.439)
    // Aproximadamente: -0.55°, 38.8° (cerca de Valencia, España)
    const centerCoordinates = fromLonLat([-0.55, 38.8]);

    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        miCapa
      ],
      view: new View({
        center: centerCoordinates,
        zoom: 10.5
      })
    });

    this.map.addControl(new FullScreen());
  }

  async loadGeoTIFF(url: string) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      const raster = await image.readRasters();

      const width = image.getWidth();
      const height = image.getHeight();
      const bbox = image.getBoundingBox();

      console.log('GeoTIFF cargado:', {
        width,
        height,
        bbox,
        projection: 'WGS 84 / Pseudo-Mercator (EPSG:3857)'
      });

      return { raster, width, height, bbox };
    } catch (error) {
      console.error('Error cargando GeoTIFF:', error);
      throw error;
    }
  }

  createGeoTIFFLayer(rasterData: any) {
    const { raster, width, height, bbox } = rasterData;

    // Crear canvas con los datos del raster
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const imageData = ctx.createImageData(width, height);
    const pixelData = imageData.data;

    // Tu archivo tiene 4 bandas (RGBA), así que usamos todas
    for (let i = 0; i < raster[0].length; i++) {
      const pixel = i * 4;
      
      // Usar las 4 bandas del GeoTIFF
      pixelData[pixel] = raster[0][i];     // Red
      pixelData[pixel + 1] = raster[1][i]; // Green  
      pixelData[pixel + 2] = raster[2][i]; // Blue
      pixelData[pixel + 3] = raster[3][i]; // Alpha
    }

    ctx.putImageData(imageData, 0, 0);

    // El extent ya está en EPSG:3857 (Web Mercator), NO necesita transformación
    const extent = [bbox[0], bbox[1], bbox[2], bbox[3]];

    console.log('Extent (ya en Web Mercator):', {
      extent,
      aproximateCenter: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
    });

    // Crear source con ImageStatic - proyección ya coincide
    const source = new ImageStatic({
      url: canvas.toDataURL(),
      imageExtent: extent,
      projection: 'EPSG:3857' // Misma proyección que el mapa base
    });

    const layer = new ImageLayer({
      source,
      opacity: 0.5 // Semi-transparente para ver el mapa base
    });

    // Ajustar vista al extent de la imagen
    setTimeout(() => {
      if (this.map) {
        this.map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 1000
        });
      }
    }, 100);

    return layer;
  }
}