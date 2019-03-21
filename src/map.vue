<template>
  <div class style="position: relative; width: 100%; height: 100%">
    <div id="map"></div>
  </div>
</template>
<script>
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import mapboxgl from "mapbox-gl";
const MapboxDraw = require("@mapbox/mapbox-gl-draw");
import RadiusMode from "./RadiusMode";
import drawStyles from "./draw-styles";

const { log } = console;

export default {
  name: "places-map",
  props: ["places"],
  data() {
    return {
      locate: null,
      mapOptions: {
        container: "map",
        center: [2, 42],
        zoom: 9,
        style: "mapbox://styles/mapbox/streets-v10",
        attributionControl: false,
        accessToken:
          "pk.eyJ1IjoiaW5ub3F1YW50IiwiYSI6IlFzU0RwbW8ifQ._JK3fPPZZNPLDRnDPbD_kg",
        preserveDrawingBuffer:
          navigator.userAgent.toLowerCase().indexOf("firefox") > -1
      },
      mapLoaded: false,
      metricId: null,
      geoJSON: null,
      isPitched3D: false,
      locationPopup: null
    };
  },
  methods: {
    initMap() {
      log(RadiusMode);
      const Draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true
        },
        styles: drawStyles,
        modes: Object.assign(
          {
            RadiusMode: RadiusMode
          },
          MapboxDraw.modes
        )
      });

      mapboxgl.accessToken = this.mapOptions.accessToken;

      this.map = new mapboxgl.Map(this.mapOptions);

      this.map.addControl(Draw, "top-left");

      this.locationPopup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false
      });

      // add nav control
      var nav = new mapboxgl.NavigationControl();
      this.map.addControl(nav, "top-right");

      // add full extent button
      //map.addControl(new FullExtent({}), "top-right");

      // add full screen button
      this.map.addControl(new mapboxgl.FullscreenControl());

      // disable map rotation until 3D support added
      // map.dragRotate.disable();
      this.map.touchZoomRotate.disableRotation();

      document.getElementById("points").addEventListener("click", () => {
        Draw.changeMode("RadiusMode");
      });

      // after map initiated, grab geography and intiate/style neighborhoods
      this.map.on("load", () => {
        this.mapLoaded = true;
        //this.privateState.geoJSON = geog;
        //this.initNeighborhoods();
        //this.styleNeighborhoods();

        this.addGeofences();
      });
    },
    flyToMapPosition({ longitude, latitude }) {
      this.map.flyTo({
        center: [longitude, latitude],
        zoom: 12,
        maxDuration: 0,
        speed: 3
      });
    },

    buildFeatureData() {
      const data = {
        type: "FeatureCollection",
        features: []
      };
      this.places.forEach(place => {
        const {
          config: { geoFence }
        } = place;
        if (geoFence) {
          let feature = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [geoFence.longitude, geoFence.latitude]
            },
            properties: {
              "geofence-radius": 10
            }
          };
          data.features.push(feature);
        }
      });

      return data;
    },

    addGeofences() {
      log(this.buildFeatureData());
      this.map.addSource("geofences", {
        type: "geojson",
        data: this.buildFeatureData()
      });

      this.map.addLayer(
        {
          id: "geofences-fill",
          source: "geofences",
          type: "circle",
          paint: {
            "circle-radius": ["get", "geofence-radius"],
            "circle-color": "#123456"
          }
        },
        "waterway-label"
      );
    }
  },

  mounted() {
    this.initMap();
    this.$root.$on("flyto", this.flyToMapPosition);
  }
};
</script>

<style lang="css">
#map {
  width: 100%;
  min-height: 600px;
}
.mapboxgl-popup {
  max-width: 400px;
}
.mapboxgl-popup-content {
  padding: 10px 10px 5px;
}
#btnPitch {
  position: absolute;
  bottom: 4px;
  left: 4px;
  border-radius: 4px;
  /*width: 30px;*/
  height: 30px;
  min-width: 30px;
  padding: 4px 7px;
  /*box-shadow: 0 0 0 2px rgba(0,0,0,.1);*/
  line-height: inherit;
  background-color: rgba(158, 158, 158, 0.4);
  /*background: #ffffff;*/
}
</style>
