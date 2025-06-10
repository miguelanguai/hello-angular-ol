import { Component } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import { FullScreen } from 'ol/control.js';
import { fromLonLat } from 'ol/proj';
import XYZ from 'ol/source/XYZ';

import * as GeoTIFF from 'geotiff';

import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import { transformExtent } from 'ol/proj';

import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';

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
    // Definir y registrar la proyección específica de tu archivo cea.tif
    this.setupProjections();

    const rasterdata = await this.loadGeoTIFF('cea.tif');
    const geoTiffLayer = this.createGeoTIFFLayer(rasterdata);

    // Coordenadas centradas en el área de tu raster (Los Angeles area)
    const centerCoordinates = fromLonLat([-117.4743, 33.8042]);

    const openStreetMapHumanitarian = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attributions: '© OpenStreetMap contributors, Tiles style by Humanitarian OSM Team'
      })
    });

    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        openStreetMapHumanitarian,
        geoTiffLayer
      ],
      view: new View({
        center: centerCoordinates,
        zoom: 10.5
      })
    });

    this.map.addControl(new FullScreen());
  }

  // Configurar la proyección específica de tu archivo
  private setupProjections() {
    // Opción 1: Definición original
    proj4.defs('CUSTOM:CEA',
      '+proj=cea +lat_ts=33.75 +lon_0=-117.333333333333 +x_0=0 +y_0=0 +datum=NAD27 +units=m +no_defs'
    );

    // Opción 2: Con transformación más precisa NAD27 -> WGS84
    proj4.defs('CUSTOM:CEA_PRECISE',
      '+proj=cea +lat_ts=33.75 +lon_0=-117.333333333333 +x_0=0 +y_0=0 +datum=NAD27 +towgs84=-8,160,176,0,0,0,0 +units=m +no_defs'
    );

    register(proj4);
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
        projection: 'Lambert Cylindrical Equal Area'
      });

      return { raster: raster[0], width, height, bbox };
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

    // Convertir datos del raster a RGBA (escala de grises)
    for (let i = 0; i < raster.length; i++) {
      const pixel = i * 4;
      const value = raster[i];

      pixelData[pixel] = value;     // R
      pixelData[pixel + 1] = value; // G
      pixelData[pixel + 2] = value; // B
      pixelData[pixel + 3] = 255;   // A
    }

    ctx.putImageData(imageData, 0, 0);

    // Extent original en la proyección del archivo
    const originalExtent = [bbox[0], bbox[1], bbox[2], bbox[3]];

    // OPCIÓN 1: Transformación estándar
    let transformedExtent = transformExtent(
      originalExtent,
      'CUSTOM:CEA',
      'EPSG:3857'
    );

    // OPCIÓN 2: Probar con la proyección más precisa
    // let transformedExtent = transformExtent(
    //   originalExtent,
    //   'CUSTOM:CEA_PRECISE',
    //   'EPSG:3857'
    // );

    // OPCIÓN 3: Ajuste manual si sigue desplazado
    const offsetY = -5000; // Ajustar según necesites (metros en Web Mercator)
    transformedExtent = [
      transformedExtent[0],
      transformedExtent[1] + offsetY,
      transformedExtent[2],
      transformedExtent[3] + offsetY
    ];

    console.log('Extents:', {
      original: originalExtent,
      transformed: transformedExtent,
      // Coordenadas en lat/lon para verificar
      corners: {
        bottomLeft: proj4('CUSTOM:CEA', 'EPSG:4326', [originalExtent[0], originalExtent[1]]),
        topRight: proj4('CUSTOM:CEA', 'EPSG:4326', [originalExtent[2], originalExtent[3]])
      }
    });

    // Crear source con ImageStatic (más simple y eficiente)
    const source = new ImageStatic({
      url: canvas.toDataURL(),
      imageExtent: transformedExtent,
      projection: 'EPSG:3857'
    });

    const layer = new ImageLayer({
      source,
      opacity: 0.8  // Semi-transparente para ver el mapa base
    });

    // Ajustar vista al extent de la imagen después de un breve delay
    setTimeout(() => {
      this.map.getView().fit(transformedExtent, {
        padding: [50, 50, 50, 50],
        duration: 1000
      });
    }, 100);

    return layer;
  }
}