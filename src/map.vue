<template>
  <div class style="position: relative; width: 100%; height: 100%">
    <div id="map"></div>
    <div id="debug"></div>

    <el-dialog title="Shipping address" :visible.sync="dialogFormVisible">
      <el-form :model="newPlace">
        <el-form-item label="Place name">
          <el-input v-model="newPlace.name" autocomplete="off"></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelCreatePlaceClose">Cancel</el-button>
        <el-button type="primary" @click="cancelCreatePlaceClose">Confirm</el-button>
      </span>
    </el-dialog>
  </div>
</template>
<script>
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import mapboxgl from "mapbox-gl";
const MapboxDraw = require("@mapbox/mapbox-gl-draw");
//import RadiusMode from "./RadiusMode";
import RadiusModeCircle from "./RadiusMode";
import MapboxCircle from "mapbox-gl-circle";
import MapBoxGLButtonControl from "./MapBoxGLButtonControl";
import drawStyles from "./draw-styles";
import { setTimeout } from "timers";

const { log } = console;

export default {
  name: "places-map",
  props: ["places"],
  data() {
    return {
      newPlace: {
        name: ""
      },
      locate: null,
      dialogFormVisible: false,
      mapOptions: {
        container: "map",
        center: [2.1734, 41.3851],
        zoom: 12,
        style: "mapbox://styles/mapbox/streets-v10",
        attributionControl: false,
        accessToken:
          "pk.eyJ1IjoiaW5ub3F1YW50IiwiYSI6IlFzU0RwbW8ifQ._JK3fPPZZNPLDRnDPbD_kg",
        preserveDrawingBuffer:
          navigator.userAgent.toLowerCase().indexOf("firefox") > -1
      },
      mapMode: "viewMode",
      mapLoaded: false,
      metricId: null,
      geoJSON: null,
      isPitched3D: false,
      locationPopup: null,
      editingId: ""
    };
  },
  methods: {
    cancelCreatePlaceClose() {
      this.dialogFormVisible = false;

      if (this.newCircle) {
        this.newCircle.remove();
      } else {
        this.map.removeLayer("newPolygon");
      }
    },
    initMap() {
      log(RadiusModeCircle);
      this.drawControl = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true
        },
        styles: drawStyles,
        modes: Object.assign(
          {
            RadiusMode: RadiusModeCircle
          },
          MapboxDraw.modes
        )
      });

      mapboxgl.accessToken = this.mapOptions.accessToken;

      this.geoFences = [];
      this.newCircle = null;
      this.map = new mapboxgl.Map(this.mapOptions);

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

      this.map.on("draw.create", this.createPlace.bind(this));

      // after map initiated, grab geography and intiate/style neighborhoods
      this.map.on("load", () => {
        this.mapLoaded = true;
        this.drawCircleGeofences();
        this.addCreatePlaceControlToMap();
      });
    },

    createPlace(geofence) {
      const type = geofence.features[0].geometry.type;
      const { coordinates } = geofence.features[0].geometry;

      if (type === "Polygon") {
        this.createPolygon(coordinates);
      } else {
        const { radius } = geofence.features[0].properties;
        this.createCircle(coordinates, radius);
      }
      setTimeout(this.changeMode.bind(this, "viewMode"), 300);

      this.dialogFormVisible = true;
    },

    createCircle(coordinates, radius) {
      this.newCircle = new MapboxCircle(coordinates, radius, {
        editable: false,
        minRadius: 50,
        fillColor: "#29AB87"
      }).addTo(this.map);
    },

    flyToMapPosition({ longitude, latitude }) {
      this.map.flyTo({
        center: [longitude, latitude],
        zoom: 12,
        maxDuration: 0,
        speed: 3
      });
    },

    drawCircleGeofences() {
      this.places.forEach(place => {
        const {
          config: { geoFence },
          placeId
        } = place;
        if (geoFence) {
          this.addCircleGeofence(geoFence, placeId);
        }
      });
    },

    addCircleGeofence(geoFence, placeId) {
      const fence = new MapboxCircle(
        [geoFence.longitude, geoFence.latitude],
        geoFence.radius,
        {
          editable: false,
          minRadius: 50,
          fillColor: "#29AB87",
          properties: {
            geoFenceId: placeId
          }
        }
      ).addTo(this.map);

      fence.on("click", this.onClickGeofence.bind(this, placeId));
      fence.once("radiuschanged", this.onRadiusChanged.bind(this));

      this.geoFences.push(fence);
    },

    onClickGeofence(placeId) {
      if (this.mapMode === "viewMode") {
        // change mode to editMode
        this.changeMode("editMode");
        // turn this circle to editable

        this.changecircleGeofenceStatus(placeId, true);

        this.editingId = placeId;
      }
    },

    changecircleGeofenceStatus(placeId, isEditable) {
      const foundIndex = this.geoFences.findIndex(
        g => g.options.properties.geoFenceId === placeId
      );
      const fence = this.geoFences[foundIndex];
      this.geoFences[foundIndex].remove();

      this.geoFences[foundIndex] = new MapboxCircle(
        fence.center,
        fence.radius,
        {
          editable: isEditable,
          minRadius: 50,
          fillColor: "#29AB87",
          properties: {
            geoFenceId: placeId
          }
        }
      ).addTo(this.map);

      this.geoFences[foundIndex].on(
        "click",
        this.onClickGeofence.bind(this, placeId)
      );
    },

    onRadiusChanged(r) {
      log(r);
    },

    createPolygon(coordinates) {
      log(coordinates);
      this.map.addLayer({
        id: "newPolygon",
        type: "fill",
        source: {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates
            }
          }
        },
        layout: {},
        paint: {
          "fill-color": "#088",
          "fill-opacity": 0.3,
          "fill-outline-color": "#000"
        }
      });
    },

    addCreatePlaceControlToMap() {
      this.addPlaceControl = new MapBoxGLButtonControl({
        className: "mapbox-gl-add-button",
        title: "Draw Point",
        eventHandler: this.addPlace.bind(this)
      });

      this.map.addControl(this.addPlaceControl, "bottom-right");
    },

    addDrawControlsToMap() {
      this.map.addControl(this.drawControl, "top-left");

      this.addCircleControl = new MapBoxGLButtonControl({
        className: "mapbox-gl-draw-radius",
        title: "Draw Circle",
        eventHandler: this.changeToRadiusMode.bind(this)
      });

      this.map.addControl(this.addCircleControl, "top-left");
    },

    changeToRadiusMode() {
      this.drawControl.changeMode("RadiusMode");
    },

    addCancelCreatingPlaceControlToMap() {
      this.addCancelCreatingControl = new MapBoxGLButtonControl({
        className: "mapbox-gl-draw-cancel",
        title: "Cancel drawing geofence",
        eventHandler: this.cancelCreatingPlace.bind(this)
      });

      this.map.addControl(this.addCancelCreatingControl, "top-left");
    },

    addFinishEditingPlaceControlToMap() {
      this.addFinishEditingControl = new MapBoxGLButtonControl({
        className: "mapbox-gl-draw-done",
        title: "Finish editing geofence",
        eventHandler: this.finishEditingPlace.bind(this)
      });

      this.map.addControl(this.addFinishEditingControl, "top-left");
    },

    addPlace() {
      this.changeMode("createMode");
    },

    cancelCreatingPlace() {
      this.changeMode("viewMode");
    },

    finishEditingPlace() {
      this.changeMode("viewMode");
    },

    endEditingFence() {
      this.changecircleGeofenceStatus(this.editingId, false);
      this.editingId = "";
    },

    changeMode(newMapMode) {
      this.mapMode = newMapMode;

      if (this.mapMode === "createMode") {
        this.map.removeControl(this.addPlaceControl);
        this.addDrawControlsToMap();
        this.addCancelCreatingPlaceControlToMap();
        //this.map.getCanvas().style.cursor = "crosshair";
      }

      if (this.mapMode === "viewMode") {
        if (this.editingId) {
          this.endEditingFence();
          this.map.removeControl(this.addFinishEditingControl);
        } else {
          this.map.removeControl(this.drawControl);
          this.map.removeControl(this.addCircleControl);
          this.map.removeControl(this.addCancelCreatingControl);
        }

        this.addCreatePlaceControlToMap();
      }

      if (this.mapMode === "editMode") {
        this.map.removeControl(this.addPlaceControl);
        this.addFinishEditingPlaceControlToMap();
        //this.map.getCanvas().style.cursor = "crosshair";
      }
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

.add-control {
  padding: 10px;
}

.mapbox-gl-draw_line {
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: auto;
  background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+PHN2ZyAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgICB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgICB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiICAgd2lkdGg9IjIwIiAgIGhlaWdodD0iMjAiICAgdmlld0JveD0iMCAwIDIwIDIwIiAgIGlkPSJzdmcxOTE2NyIgICB2ZXJzaW9uPSIxLjEiICAgaW5rc2NhcGU6dmVyc2lvbj0iMC45MStkZXZlbCtvc3htZW51IHIxMjkxMSIgICBzb2RpcG9kaTpkb2NuYW1lPSJsaW5lLnN2ZyI+ICA8ZGVmcyAgICAgaWQ9ImRlZnMxOTE2OSIgLz4gIDxzb2RpcG9kaTpuYW1lZHZpZXcgICAgIGlkPSJiYXNlIiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiICAgICBib3JkZXJvcGFjaXR5PSIxLjAiICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIgICAgIGlua3NjYXBlOnpvb209IjE2IiAgICAgaW5rc2NhcGU6Y3g9IjEyLjg5ODc3NSIgICAgIGlua3NjYXBlOmN5PSI5LjU4OTAxNTIiICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiICAgICBpbmtzY2FwZTpjdXJyZW50LWxheWVyPSJsYXllcjEiICAgICBzaG93Z3JpZD0idHJ1ZSIgICAgIHVuaXRzPSJweCIgICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTI4MCIgICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9Ijc1MSIgICAgIGlua3NjYXBlOndpbmRvdy14PSIwIiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjIzIiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMCIgICAgIGlua3NjYXBlOm9iamVjdC1ub2Rlcz0idHJ1ZSI+ICAgIDxpbmtzY2FwZTpncmlkICAgICAgIHR5cGU9Inh5Z3JpZCIgICAgICAgaWQ9ImdyaWQxOTcxNSIgLz4gIDwvc29kaXBvZGk6bmFtZWR2aWV3PiAgPG1ldGFkYXRhICAgICBpZD0ibWV0YWRhdGExOTE3MiI+ICAgIDxyZGY6UkRGPiAgICAgIDxjYzpXb3JrICAgICAgICAgcmRmOmFib3V0PSIiPiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+ICAgICAgICA8ZGM6dHlwZSAgICAgICAgICAgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIgLz4gICAgICAgIDxkYzp0aXRsZSAvPiAgICAgIDwvY2M6V29yaz4gICAgPC9yZGY6UkRGPiAgPC9tZXRhZGF0YT4gIDxnICAgICBpbmtzY2FwZTpsYWJlbD0iTGF5ZXIgMSIgICAgIGlua3NjYXBlOmdyb3VwbW9kZT0ibGF5ZXIiICAgICBpZD0ibGF5ZXIxIiAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtMTAzMi4zNjIyKSI+ICAgIDxwYXRoICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2Rpc3BsYXk6aW5saW5lO292ZXJmbG93OnZpc2libGU7dmlzaWJpbGl0eTp2aXNpYmxlO2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtmaWxsLXJ1bGU6bm9uemVybztzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MzttYXJrZXI6bm9uZTtlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIiAgICAgICBkPSJtIDEzLjUsMTAzNS44NjIyIGMgLTEuMzgwNzEyLDAgLTIuNSwxLjExOTMgLTIuNSwyLjUgMCwwLjMyMDggMC4wNDYxNCwwLjYyNDQgMC4xNTYyNSwwLjkwNjMgbCAtMy43NSwzLjc1IGMgLTAuMjgxODM2LC0wLjExMDIgLTAuNTg1NDIxLC0wLjE1NjMgLTAuOTA2MjUsLTAuMTU2MyAtMS4zODA3MTIsMCAtMi41LDEuMTE5MyAtMi41LDIuNSAwLDEuMzgwNyAxLjExOTI4OCwyLjUgMi41LDIuNSAxLjM4MDcxMiwwIDIuNSwtMS4xMTkzIDIuNSwtMi41IDAsLTAuMzIwOCAtMC4wNDYxNCwtMC42MjQ0IC0wLjE1NjI1LC0wLjkwNjIgbCAzLjc1LC0zLjc1IGMgMC4yODE4MzYsMC4xMTAxIDAuNTg1NDIxLDAuMTU2MiAwLjkwNjI1LDAuMTU2MiAxLjM4MDcxMiwwIDIuNSwtMS4xMTkzIDIuNSwtMi41IDAsLTEuMzgwNyAtMS4xMTkyODgsLTIuNSAtMi41LC0yLjUgeiIgICAgICAgaWQ9InJlY3Q2NDY3IiAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPiAgPC9nPjwvc3ZnPg==);
}

.mapbox-gl-add-button {
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: auto;
  background-image: url("data:image/png;base64,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");
}

.mapbox-gl-draw-radius {
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: auto;
  background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAADnUlEQVQ4EYVVXUhTYRg+f+uc/TU3MYImmElLlxexILQCg8KwugrvvNhl0GV10Z1204VB0F0Q1IXUTUEQpFQ3KW10oYYxURoyaHOI+bfpds6OO6fnObqYJvjCt7Pv+973eZ/37xxxcHBQSqVSYjQatUdGRlzpdNoQIH6//8zW1tZt27bPYRvkGWRNFMVpr9f7rlgszvGgra1NHRgYMGsYclNTk7S8vCzOz385MjOT0RsbG09UKvprw6jckyTJkGV5HOsz1nfsV4ERMwzjIfZXQ6HQ11wut2YYac0wNAsEBIEMu7rCbnpTVfUGGBQVRRoGYx/PDhLeKYoyDN0CbahDDGI5lHmwC6b7/dpl7hGqSKWWlhaNYXHxP894Rx23230JoHoNlPfOBcNcXV2d8/nUvmJRnyADTdOM1tZWi+mgcU2QInthYUHSdV1F3jYJiv8fEX77yspKTqYicyZJ4piumy8I1tHRUd7e3hZKpdIeMOryDIwEsDHBzru4uJhG+CGAxsH8jcRqWpbQGYm0DzEHSOw2WZEJASjZbFbm2tnt/FKHUTD8SCQyZFlWJ7EUtgaq9430jx7dcGcy2TJMNLSPw665WRDSaedMCAQCLhj9c8SUdHc3a6lUdhNVTxALrMW3oDxumuYzeoPXa2iLT/VsAgHPedMUqgh3OhaL7QHNZDIKlu5yue4iTVcUGDaC4S94PynL0qhtC8dweR/nvKvAyfFCofyYDjweT2xycnKKFQ+Hw1WegYzDGMSy2AZpRLGRAxVg7EcZIA14KlAy8fRgWViSy4XfQ4SAfwB2GqM01tPTcyqZTDLk0Xo7MHtPsI2N0tRuyA476iBMJ9cgEcZ2jSx+APACL5kPgtUmh2eUZDI7xef+/LETMHZiJoMQLOsisKYlDjo37L94PF5ht6tqm1m/apNSX2E6YIMnEr912gKjm1gOXZT8A9DnQP9BrbH3TwgB6oXsZmdn3Ww3FOaJbVcj1ap9y2lWjM04WuIlxmiCnQ9wLzxWUUl7/7QQaGlpScrn8+i/1CZn3zDMp8Fg6Hq5XC7+93LgbJIJe/KwlwPB4LyMUeyjDdN10OurgBCGGTqVDhLeMUyAFWtgdM7RFfv7+2XmC9VyoZplvnnW19efI+SzaPgExxKGbFqyDrOALIAkCT8bGkJ3+IYhGIvIdCjwZiMXQjTaY+TzrzS0Tg62NznonE2OE/Z7PgE+n+8RPwEAc8Ls7Y0bwHAK/BdS/vaHPHoz+wAAAABJRU5ErkJggg==");
}

.mapbox-gl-draw-done {
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: auto;
  background-image: url("data:image/png;base64,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");
}

.mapbox-gl-draw-cancel {
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: auto;
  background-image: url("data:image/png;base64,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");
}
</style>
